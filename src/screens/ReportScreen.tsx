import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { getActivityLog } from '../storage/activityStorage';
import { getEntries } from '../storage/entriesStorage';
import { getArchivedWheels } from '../storage/focusWheelStorage';
import { getArchivedPlacemats } from '../storage/placematStorage';
import { getArchivedPivots } from '../storage/pivotStorage';
import { getWorkshop } from '../storage/workshopStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

type Scale = '7d' | '1m' | '1y';
type ProcessKey =
  | 'meditation'
  | 'sixty_eight'
  | 'book'
  | 'focus_wheel'
  | 'placemat'
  | 'pivot'
  | 'workshop';

type PeriodData = {
  key: string; // YYYY-MM-DD (daily) or YYYY-MM (monthly)
  emotionLevel: number | null;
  completions: Record<ProcessKey, number>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

// Colors matching the Emotional Guidance Scale, levels 1–22
const EMOTION_COLORS = [
  '#FFD700', '#FFC107', '#FFAB40', '#A5D6A7', '#66BB6A',
  '#4DB6AC', '#4FC3F7', '#90A4AE', '#78909C', '#FFCC80',
  '#FFA726', '#FF8A65', '#FF7043', '#EF5350', '#E53935',
  '#C62828', '#AD1457', '#880E4F', '#6A1B9A', '#4527A0',
  '#283593', '#1A237E',
];

const PROCESS_EMOJIS: Record<ProcessKey, string> = {
  meditation:  '🧘',
  sixty_eight: '⏱️',
  book:        '📖',
  focus_wheel: '🎯',
  placemat:    '🍽️',
  pivot:       '🔄',
  workshop:    '🎨',
};

const PROCESS_KEYS: ProcessKey[] = [
  'meditation', 'sixty_eight', 'book', 'focus_wheel', 'placemat', 'pivot', 'workshop',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isoToDateKey(iso: string): string  { return toDateKey(new Date(iso)); }
function isoToMonthKey(iso: string): string { return toMonthKey(new Date(iso)); }

function buildPeriodKeys(scale: Scale): string[] {
  const now = new Date();
  if (scale === '7d') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return toDateKey(d);
    });
  }
  if (scale === '1m') {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (29 - i));
      return toDateKey(d);
    });
  }
  // '1y' — last 12 calendar months
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - (11 - i));
    return toMonthKey(d);
  });
}

function formatPeriodLabel(key: string, scale: Scale): string {
  if (scale === '1y') {
    const mon = parseInt(key.slice(5, 7), 10) - 1;
    return `${MONTH_NAMES[mon]} ${key.slice(0, 4)}`;
  }
  const d = new Date(key + 'T12:00:00'); // noon avoids DST edge cases
  return `${DAY_SHORT[d.getDay()]} ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ── Data loading ──────────────────────────────────────────────────────────────

function emptyCompletions(): Record<ProcessKey, number> {
  return { meditation: 0, sixty_eight: 0, book: 0, focus_wheel: 0, placemat: 0, pivot: 0, workshop: 0 };
}

async function loadReportData(scale: Scale): Promise<PeriodData[]> {
  const periods = buildPeriodKeys(scale);
  const keyFn   = scale === '1y' ? isoToMonthKey : isoToDateKey;

  const [activityLog, entries, wheels, placemats, pivots, workshop] = await Promise.all([
    getActivityLog(),
    getEntries(),
    getArchivedWheels(),
    getArchivedPlacemats(),
    getArchivedPivots(),
    getWorkshop(),
  ]);

  const allWantItems = [
    ...workshop.body,
    ...workshop.home,
    ...workshop.relationships,
    ...workshop.work,
    ...workshop.customTopics.flatMap((ct) => ct.wants),
    ...workshop.archive.flatMap((a) => a.items),
  ];

  // Build map seeded with all periods
  const dataMap: Record<string, PeriodData & { _emotions: number[] }> = {};
  for (const key of periods) {
    dataMap[key] = { key, emotionLevel: null, completions: emptyCompletions(), _emotions: [] };
  }

  // Activity log events
  for (const event of activityLog) {
    const key = keyFn(event.timestamp);
    if (!dataMap[key]) continue;
    if (event.type === 'meditation')  dataMap[key].completions.meditation++;
    if (event.type === 'sixty_eight') dataMap[key].completions.sixty_eight++;
    if (event.type === 'emotion')     dataMap[key]._emotions.push(event.level);
  }

  // Resolve emotion level per period
  for (const key of periods) {
    const levels = dataMap[key]._emotions;
    if (levels.length === 0) continue;
    // Daily: last logged; Monthly: average
    dataMap[key].emotionLevel = scale === '1y'
      ? levels.reduce((a, b) => a + b, 0) / levels.length
      : levels[levels.length - 1];
  }

  // Other data sources
  for (const entry of entries) {
    const key = keyFn(entry.createdAt);
    if (dataMap[key]) dataMap[key].completions.book++;
  }
  for (const wheel of wheels) {
    if (!wheel.archivedAt) continue;
    const key = keyFn(wheel.archivedAt);
    if (dataMap[key]) dataMap[key].completions.focus_wheel++;
  }
  for (const placemat of placemats) {
    const key = keyFn(placemat.createdAt);
    if (dataMap[key]) dataMap[key].completions.placemat++;
  }
  for (const pivot of pivots) {
    const key = keyFn(pivot.createdAt);
    if (dataMap[key]) dataMap[key].completions.pivot++;
  }
  for (const item of allWantItems) {
    const key = keyFn(item.createdAt);
    if (dataMap[key]) dataMap[key].completions.workshop++;
  }

  return periods.map((key) => {
    const { _emotions: _, ...rest } = dataMap[key];
    return rest;
  });
}

// ── Emotion chart ─────────────────────────────────────────────────────────────

const CHART_H = 168;
const PAD = { top: 12, bottom: 28, left: 28, right: 8 };

function getXLabel(key: string, scale: Scale, idx: number): string | null {
  if (scale === '7d') {
    return DAY_SHORT[new Date(key + 'T12:00:00').getDay()];
  }
  if (scale === '1m') {
    return idx % 7 === 0 ? String(parseInt(key.slice(8), 10)) : null;
  }
  return MONTH_SHORT[parseInt(key.slice(5, 7), 10) - 1];
}

function EmotionChart({
  data,
  scale,
  svgWidth,
}: {
  data: PeriodData[];
  scale: Scale;
  svgWidth: number;
}) {
  const plotW = svgWidth - PAD.left - PAD.right;
  const plotH = CHART_H - PAD.top - PAD.bottom;
  const n     = data.length;
  const dotR  = scale === '1m' ? 3 : 5;

  const xPos = (i: number) =>
    PAD.left + (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);
  const yPos = (level: number) =>
    PAD.top + ((level - 1) / 21) * plotH;

  const tippingY = yPos(7);

  const validPoints = data
    .map((d, i) =>
      d.emotionLevel !== null
        ? { x: xPos(i), y: yPos(d.emotionLevel), level: d.emotionLevel }
        : null
    )
    .filter((p): p is { x: number; y: number; level: number } => p !== null);

  return (
    <Svg width={svgWidth} height={CHART_H}>
      {/* Subtle background grid */}
      {[1, 14, 22].map((level) => (
        <Line
          key={level}
          x1={PAD.left} y1={yPos(level)}
          x2={PAD.left + plotW} y2={yPos(level)}
          stroke="rgba(176,138,212,0.07)" strokeWidth={1}
        />
      ))}

      {/* Tipping point dashed line */}
      <Line
        x1={PAD.left} y1={tippingY}
        x2={PAD.left + plotW} y2={tippingY}
        stroke="rgba(176,138,212,0.28)" strokeWidth={1}
        strokeDasharray="4,3"
      />
      <SvgText
        x={PAD.left + plotW} y={tippingY - 3}
        fill="rgba(176,138,212,0.4)" fontSize={8} textAnchor="end"
      >
        tipping point
      </SvgText>

      {/* Y axis labels */}
      <SvgText x={PAD.left - 4} y={PAD.top + 4}
        fill="rgba(176,138,212,0.5)" fontSize={9} textAnchor="end">1</SvgText>
      <SvgText x={PAD.left - 4} y={tippingY + 4}
        fill="rgba(176,138,212,0.5)" fontSize={9} textAnchor="end">7</SvgText>
      <SvgText x={PAD.left - 4} y={PAD.top + plotH + 4}
        fill="rgba(176,138,212,0.5)" fontSize={9} textAnchor="end">22</SvgText>

      {/* Connecting line */}
      {validPoints.length > 1 && (
        <Polyline
          points={validPoints.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(155,114,204,0.45)"
          strokeWidth={1.5}
        />
      )}

      {/* Data dots */}
      {validPoints.map((p, i) => (
        <Circle
          key={i}
          cx={p.x} cy={p.y} r={dotR}
          fill={EMOTION_COLORS[Math.min(Math.round(p.level) - 1, 21)]}
        />
      ))}

      {/* X axis labels */}
      {data.map((d, i) => {
        const label = getXLabel(d.key, scale, i);
        if (!label) return null;
        return (
          <SvgText
            key={i}
            x={xPos(i)} y={CHART_H - 4}
            fill="rgba(176,138,212,0.5)" fontSize={9} textAnchor="middle"
          >
            {label}
          </SvgText>
        );
      })}
    </Svg>
  );
}

// ── Period row ────────────────────────────────────────────────────────────────

function PeriodRow({ data, scale }: { data: PeriodData; scale: Scale }) {
  const hasActivity =
    data.emotionLevel !== null ||
    PROCESS_KEYS.some((k) => data.completions[k] > 0);

  if (!hasActivity && scale !== '7d') return null;

  const emotionIdx = data.emotionLevel !== null
    ? Math.min(Math.round(data.emotionLevel) - 1, 21)
    : -1;
  const emotionColor = emotionIdx >= 0 ? EMOTION_COLORS[emotionIdx] : null;
  const completedProcesses = PROCESS_KEYS.filter((k) => data.completions[k] > 0);

  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label} numberOfLines={1}>
        {formatPeriodLabel(data.key, scale)}
      </Text>
      {emotionColor ? (
        <View style={[rowStyles.badge, { backgroundColor: emotionColor }]}>
          <Text style={rowStyles.badgeText}>{Math.round(data.emotionLevel!)}</Text>
        </View>
      ) : (
        <View style={rowStyles.badgePlaceholder} />
      )}
      <View style={rowStyles.icons}>
        {completedProcesses.map((k) => (
          <Text key={k} style={rowStyles.icon}>{PROCESS_EMOJIS[k]}</Text>
        ))}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(176,138,212,0.08)',
    gap: 10,
  },
  label: {
    width: 116,
    fontSize: 14,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePlaceholder: {
    width: 28,
    height: 28,
  },
  badgeText: {
    fontSize: 13,
    color: '#000',
    fontFamily: 'Nunito_700Bold',
  },
  icons: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  icon: { fontSize: 16 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const [scale, setScale] = useState<Scale>('7d');
  const [data,  setData]  = useState<PeriodData[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      setData(null);
      loadReportData(scale).then(setData);
    }, [scale])
  );

  const svgWidth = width - 40;

  const hasAnyData = data?.some(
    (d) => d.emotionLevel !== null || PROCESS_KEYS.some((k) => d.completions[k] > 0)
  ) ?? false;

  // For the activity list, show most-recent first
  const reversedData = data ? [...data].reverse() : [];

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Your Progress</Text>
            <View style={{ width: 80 }} />
          </View>

          {/* Scale selector */}
          <View style={styles.scaleRow}>
            {(['7d', '1m', '1y'] as Scale[]).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.scalePill, scale === s && styles.scalePillActive]}
                onPress={() => setScale(s)}
              >
                <Text style={[styles.scalePillText, scale === s && styles.scalePillTextActive]}>
                  {s === '7d' ? '7 Days' : s === '1m' ? '1 Month' : '1 Year'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Emotional Level</Text>
            {data && (
              <EmotionChart data={data} scale={scale} svgWidth={svgWidth} />
            )}
          </View>

          {/* Activity list */}
          <Text style={styles.sectionTitle}>Activity</Text>

          {data && !hasAnyData && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>Your journey begins here</Text>
              <Text style={styles.emptyDesc}>
                Use the tools and select your emotional level to see your progress over time.
              </Text>
            </View>
          )}

          {data && hasAnyData && (
            <View style={styles.activityCard}>
              {reversedData.map((d) => (
                <PeriodRow key={d.key} data={d} scale={scale} />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: '#0F0720' },
  safe: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn:     { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#E8D5F5', fontFamily: 'Pacifico_400Regular' },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  scalePill: {
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  scalePillActive:     { backgroundColor: 'rgba(123,79,166,0.55)', borderColor: '#B08AD4' },
  scalePillText:       { fontSize: 15, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  scalePillTextActive: { color: '#F3E8FF' },
  chartCard: {
    backgroundColor: '#1A0A2E',
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    marginBottom: 24,
    overflow: 'hidden',
  },
  chartTitle: {
    fontSize: 15,
    color: '#C4A8D4',
    fontFamily: 'Nunito_700Bold',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#C4A8D4',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 12,
  },
  activityCard: {
    backgroundColor: '#1A0A2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 20,
    color: '#E8D5F5',
    fontFamily: 'Nunito_700Bold',
  },
  emptyDesc: {
    fontSize: 16,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
});
