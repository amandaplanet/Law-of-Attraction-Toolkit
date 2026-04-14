import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import {
  Scale, ProcessKey, PeriodData,
  EMOTION_COLORS, EMOTION_LABELS, PROCESS_EMOJIS, PROCESS_LABELS, PROCESS_KEYS,
  MONTH_SHORT, DAY_SHORT,
  toDateKey, buildPeriodKeys, formatPeriodLabel,
  loadReportData, computeStats,
} from '../utils/reportLogic';
import { logActivity } from '../storage/activityStorage';
import {
  getActiveProcess,
  getCompletedCount,
  getTodayEntry,
  getDaysMissed,
} from '../storage/thirtyDayStorage';
import { ThirtyDayProcess } from '../types';

// Full labels for the emotion picker (matches EGS screen)
const EMOTION_FULL_LABELS = [
  'Joy / Knowledge / Empowerment / Freedom / Love / Appreciation',
  'Passion',
  'Enthusiasm / Eagerness / Happiness',
  'Positive Expectation / Belief',
  'Optimism',
  'Hopefulness',
  'Contentment',
  'Boredom',
  'Pessimism',
  'Frustration / Irritation / Impatience',
  '"Overwhelment"',
  'Disappointment',
  'Doubt',
  'Worry',
  'Blame',
  'Discouragement',
  'Anger',
  'Revenge',
  'Hatred / Rage',
  'Jealousy',
  'Insecurity / Guilt / Unworthiness',
  'Fear / Grief / Depression / Despair / Powerlessness',
];

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

// ── Stat cards ────────────────────────────────────────────────────────────────

function StatCards({ data, scale }: { data: PeriodData[]; scale: Scale }) {
  const { avgLevel, bestLevel, totalSessions, streak, periodLabel, streakUnit } = computeStats(data, scale);
  const bestIdx   = bestLevel !== null ? Math.min(Math.round(bestLevel) - 1, 21) : -1;
  const bestColor = bestIdx >= 0 ? EMOTION_COLORS[bestIdx] : null;
  const bestLabel = bestIdx >= 0 ? EMOTION_LABELS[bestIdx] : null;
  const avgIdx    = avgLevel !== null ? Math.min(Math.round(avgLevel) - 1, 21) : -1;
  const avgColor  = avgIdx >= 0 ? EMOTION_COLORS[avgIdx] : null;

  return (
    <View style={cardStyles.grid}>
      {/* Avg level */}
      <View style={cardStyles.card}>
        {avgLevel !== null ? (
          <Text style={[cardStyles.bigNum, avgColor ? { color: avgColor } : null]}>
            {avgLevel.toFixed(1)}
          </Text>
        ) : (
          <Text style={cardStyles.bigNum}>—</Text>
        )}
        <Text style={cardStyles.cardLabel}>Avg level {periodLabel}</Text>
      </View>

      {/* Best level */}
      <View style={cardStyles.card}>
        {bestColor && bestLabel ? (
          <View style={cardStyles.bestRow}>
            <View style={[cardStyles.bestBadge, { backgroundColor: bestColor }]}>
              <Text style={cardStyles.bestBadgeText}>{Math.round(bestLevel!)}</Text>
            </View>
            <View>
              <Text style={cardStyles.bestName}>{bestLabel}</Text>
              <Text style={cardStyles.cardLabel}>Best level</Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={cardStyles.bigNum}>—</Text>
            <Text style={cardStyles.cardLabel}>Best level</Text>
          </>
        )}
      </View>

      {/* Total sessions */}
      <View style={cardStyles.card}>
        <Text style={cardStyles.bigNum}>{totalSessions}</Text>
        <Text style={cardStyles.cardLabel}>Total sessions</Text>
      </View>

      {/* Streak */}
      <View style={cardStyles.card}>
        <Text style={cardStyles.bigNum}>{streak > 0 ? `${streak} 🔥` : '—'}</Text>
        <Text style={cardStyles.cardLabel}>{streakUnit.charAt(0).toUpperCase() + streakUnit.slice(1)} streak</Text>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  card: {
    width: '48%',
    backgroundColor: '#1A0A2E',
    borderRadius: 16,
    padding: 14,
    justifyContent: 'flex-start',
  },
  bigNum: {
    fontSize: 26,
    fontFamily: 'Nunito_700Bold',
    color: '#B08AD4',
    lineHeight: 30,
  },
  cardLabel: {
    fontSize: 11,
    color: '#7B5FA0',
    fontFamily: 'Nunito_400Regular',
    marginTop: 3,
  },
  bestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bestBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bestBadgeText: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
    color: '#fff',
  },
  bestName: {
    fontSize: 13,
    fontFamily: 'Nunito_700Bold',
    color: '#E8D5F5',
    lineHeight: 16,
  },
});

// ── 30-Day Process Card ───────────────────────────────────────────────────────

function ThirtyDayProcessCard({
  process,
  navigation,
}: {
  process: ThirtyDayProcess | null;
  navigation: any;
}) {
  if (!process) {
    return (
      <TouchableOpacity
        style={processCardStyles.card}
        onPress={() => navigation.navigate('ThirtyDayIntro')}
        activeOpacity={0.85}
      >
        <Text style={processCardStyles.emoji}>🌅</Text>
        <View style={processCardStyles.text}>
          <Text style={processCardStyles.title}>Start a 30-Day Practice</Text>
          <Text style={processCardStyles.subtitle}>Morning meditation + positive aspects, daily</Text>
        </View>
        <Text style={processCardStyles.chevron}>›</Text>
      </TouchableOpacity>
    );
  }

  const completedCount = getCompletedCount(process);
  const todayEntry     = getTodayEntry(process);
  const todayDone      = todayEntry?.completed ?? false;
  const daysMissed     = getDaysMissed(process);
  const needsRestart   = daysMissed > 3;
  const dayNum         = Math.min(completedCount + (todayDone ? 0 : 1), 30);

  return (
    <TouchableOpacity
      style={[processCardStyles.card, processCardStyles.cardActive]}
      onPress={() => navigation.navigate('ThirtyDayDashboard')}
      activeOpacity={0.85}
    >
      <View style={processCardStyles.dayBubble}>
        <Text style={processCardStyles.dayNum}>{completedCount >= 30 ? '✓' : dayNum}</Text>
        <Text style={processCardStyles.dayOf}>of 30</Text>
      </View>
      <View style={processCardStyles.text}>
        {needsRestart ? (
          <>
            <Text style={processCardStyles.title}>30-Day Practice</Text>
            <Text style={processCardStyles.subtitleWarn}>It's been a few days — tap to check in</Text>
          </>
        ) : todayDone ? (
          <>
            <Text style={processCardStyles.title}>Day {completedCount} complete ✓</Text>
            <Text style={processCardStyles.subtitle}>Practice done for today</Text>
          </>
        ) : (
          <>
            <Text style={processCardStyles.title}>Day {dayNum} of 30</Text>
            <Text style={processCardStyles.subtitle}>
              {todayEntry ? 'Practice in progress' : "Ready for today's practice"}
            </Text>
          </>
        )}
      </View>
      <Text style={processCardStyles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const processCardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A0A2E',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.15)',
  },
  cardActive: {
    borderColor: 'rgba(123,79,166,0.35)',
  },
  emoji: {
    fontSize: 26,
  },
  dayBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7B4FA6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayNum: {
    fontSize: 16,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 19,
  },
  dayOf: {
    fontSize: 9,
    color: 'rgba(243,232,255,0.6)',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 11,
  },
  text: { flex: 1 },
  title: {
    fontSize: 15,
    color: '#E8D5F5',
    fontFamily: 'Nunito_700Bold',
  },
  subtitle: {
    fontSize: 13,
    color: '#7B5FA0',
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  subtitleWarn: {
    fontSize: 13,
    color: '#B08AD4',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: '#7B5FA0',
    fontFamily: 'Nunito_400Regular',
  },
});

// ── Emotion Picker Modal ───────────────────────────────────────────────────────

function EmotionPickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (level: number) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <TouchableOpacity style={modalStyles.backdrop} onPress={onClose} activeOpacity={1} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handleZone}>
            <View style={modalStyles.handle} />
          </View>
          <Text style={modalStyles.title}>Where are you right now?</Text>
          <ScrollView
            contentContainerStyle={modalStyles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {EMOTION_FULL_LABELS.map((label, i) => {
              const level = i + 1;
              const color = EMOTION_COLORS[i];
              return (
                <React.Fragment key={level}>
                  {level === 8 && (
                    <View style={modalStyles.tippingPoint}>
                      <View style={modalStyles.tippingLine} />
                      <Text style={modalStyles.tippingText}>↑ tipping point</Text>
                      <View style={modalStyles.tippingLine} />
                    </View>
                  )}
                  <TouchableOpacity
                    style={modalStyles.row}
                    onPress={() => onSelect(level)}
                    activeOpacity={0.7}
                  >
                    <View style={[modalStyles.levelBadge, { backgroundColor: color }]}>
                      <Text style={modalStyles.levelNum}>{level}</Text>
                    </View>
                    <Text style={modalStyles.rowLabel}>{label}</Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#1A0A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingBottom: 36,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(176,138,212,0.35)',
  },
  title: {
    fontSize: 18,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.15)',
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  levelBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelNum: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'Nunito_700Bold',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  tippingPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  tippingLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(176,138,212,0.25)',
  },
  tippingText: {
    fontSize: 12,
    color: 'rgba(176,138,212,0.6)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
});

// ── Period row ────────────────────────────────────────────────────────────────

function PeriodRow({
  data,
  scale,
  onLogEmotion,
}: {
  data: PeriodData;
  scale: Scale;
  onLogEmotion?: () => void;
}) {
  const hasActivity =
    data.emotionLevel !== null ||
    PROCESS_KEYS.some((k) => data.completions[k] > 0);

  const isToday = data.key === toDateKey(new Date());
  const canLogEmotion = isToday && data.emotionLevel === null && scale !== '1y';

  if (!hasActivity && scale !== '7d' && !canLogEmotion) return null;

  const completedProcesses = PROCESS_KEYS.filter((k) => data.completions[k] > 0);
  const isDaily = scale !== '1y';

  // Date label formatting
  let dateTop: string;
  let dateBottom: string;
  if (scale === '1y') {
    const mon = parseInt(data.key.slice(5, 7), 10) - 1;
    dateTop    = MONTH_SHORT[mon];
    dateBottom = data.key.slice(0, 4);
  } else {
    const d = new Date(data.key + 'T12:00:00');
    const today = toDateKey(new Date());
    dateTop    = data.key === today ? 'TODAY' : DAY_SHORT[d.getDay()].toUpperCase();
    dateBottom = `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
  }

  // Emotion display
  const multiEmotion = isDaily && data.allEmotions.length > 1;
  const firstLevel   = data.allEmotions[0];
  const lastLevel    = data.emotionLevel;

  const emotionBadge = (level: number, size: number = 24) => {
    const idx   = Math.min(Math.round(level) - 1, 21);
    const color = EMOTION_COLORS[idx];
    const isDark = idx >= 16;
    return (
      <View style={[rowStyles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
        <Text style={[rowStyles.badgeText, { fontSize: size * 0.5, color: isDark ? '#fff' : 'rgba(0,0,0,0.7)' }]}>
          {Math.round(level)}
        </Text>
      </View>
    );
  };

  return (
    <View style={rowStyles.row}>
      {/* Date column */}
      <View style={rowStyles.dateCol}>
        <Text style={[rowStyles.dateTop, data.key === toDateKey(new Date()) && rowStyles.dateTopToday]}>
          {dateTop}
        </Text>
        <Text style={rowStyles.dateBottom}>{dateBottom}</Text>
      </View>

      {/* Emotion column */}
      <View style={rowStyles.emotionCol}>
        {lastLevel !== null ? (
          multiEmotion ? (
            <View style={rowStyles.journeyWrap}>
              <View style={rowStyles.journeyRow}>
                {emotionBadge(firstLevel, 22)}
                <Text style={rowStyles.arrow}>→</Text>
                {emotionBadge(lastLevel, 22)}
              </View>
              <Text style={rowStyles.checkIns}>{data.allEmotions.length} check-ins</Text>
            </View>
          ) : (
            emotionBadge(lastLevel, 26)
          )
        ) : canLogEmotion ? (
          <TouchableOpacity style={rowStyles.logBtn} onPress={onLogEmotion} activeOpacity={0.7}>
            <Text style={rowStyles.logBtnText}>+</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Content column */}
      <View style={rowStyles.content}>
        {lastLevel !== null && (
          <Text style={rowStyles.emotionName} numberOfLines={1}>
            {multiEmotion
              ? `${EMOTION_LABELS[Math.min(Math.round(firstLevel) - 1, 21)]} → ${EMOTION_LABELS[Math.min(Math.round(lastLevel) - 1, 21)]}`
              : EMOTION_LABELS[Math.min(Math.round(lastLevel) - 1, 21)]}
          </Text>
        )}
        {completedProcesses.length > 0 && (
          <View style={rowStyles.chips}>
            {completedProcesses.map((k) => (
              <View key={k} style={rowStyles.chip}>
                <Text style={rowStyles.chipText}>
                  {PROCESS_EMOJIS[k]} {PROCESS_LABELS[k]}
                </Text>
              </View>
            ))}
          </View>
        )}
        {!hasActivity && !canLogEmotion && (
          <Text style={rowStyles.noActivity}>—</Text>
        )}
        {!hasActivity && canLogEmotion && (
          <Text style={rowStyles.logPrompt}>Log your emotion</Text>
        )}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(176,138,212,0.08)',
    gap: 10,
  },
  dateCol: {
    width: 48,
    flexShrink: 0,
  },
  dateTop: {
    fontSize: 10,
    color: '#7B5FA0',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  dateTopToday: {
    color: '#B08AD4',
  },
  dateBottom: {
    fontSize: 13,
    color: '#C4A8D4',
    fontFamily: 'Nunito_700Bold',
  },
  emotionCol: {
    width: 52,
    flexShrink: 0,
    alignItems: 'center',
    paddingTop: 2,
  },
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: 'Nunito_700Bold',
  },
  journeyWrap: {
    alignItems: 'center',
    gap: 2,
  },
  journeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  arrow: {
    fontSize: 10,
    color: '#7B5FA0',
  },
  checkIns: {
    fontSize: 9,
    color: '#7B5FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  logBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logBtnText: {
    fontSize: 18,
    color: 'rgba(176,138,212,0.55)',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 20,
  },
  content: {
    flex: 1,
  },
  emotionName: {
    fontSize: 13,
    color: '#B08AD4',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  chip: {
    backgroundColor: 'rgba(123,79,166,0.2)',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  chipText: {
    fontSize: 11,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
  },
  noActivity: {
    fontSize: 14,
    color: 'rgba(176,138,212,0.25)',
    fontFamily: 'Nunito_400Regular',
  },
  logPrompt: {
    fontSize: 13,
    color: 'rgba(176,138,212,0.4)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    paddingTop: 3,
  },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ReportScreen() {
  const navigation = useNavigation();
  const { width }  = useWindowDimensions();
  const [scale, setScale] = useState<Scale>('7d');
  const [data,  setData]  = useState<PeriodData[] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [thirtyDay, setThirtyDay] = useState<ThirtyDayProcess | null | undefined>(undefined);

  const reload = useCallback(() => {
    setData(null);
    loadReportData(scale).then(setData);
    getActiveProcess().then(setThirtyDay);
  }, [scale]);

  useFocusEffect(reload);

  const handleEmotionSelect = async (level: number) => {
    setModalVisible(false);
    await logActivity({ type: 'emotion', timestamp: new Date().toISOString(), level });
    reload();
  };

  const svgWidth = width - 40;

  const hasAnyData = data?.some(
    (d) => d.emotionLevel !== null || PROCESS_KEYS.some((k) => d.completions[k] > 0)
  ) ?? false;

  const today = toDateKey(new Date());

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
            <Text style={styles.headerTitle}>My Journey</Text>
            <View style={{ width: 80 }} />
          </View>

          {/* 30-Day Process card */}
          {thirtyDay !== undefined && (
            <ThirtyDayProcessCard process={thirtyDay} navigation={navigation} />
          )}

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

          {/* Stat cards */}
          {data && hasAnyData && (
            <StatCards data={data} scale={scale} />
          )}

          {/* Activity list */}
          <Text style={styles.sectionTitle}>Activity</Text>

          {data && !hasAnyData && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🌱</Text>
              <Text style={styles.emptyTitle}>Your journey begins here</Text>
              <Text style={styles.emptyDesc}>
                Use the tools and select your emotional level to see your journey over time.
              </Text>
            </View>
          )}

          {data && (hasAnyData || reversedData.some((d) => d.key === today)) && (
            <View style={styles.activityCard}>
              {reversedData.map((d) => (
                <PeriodRow
                  key={d.key}
                  data={d}
                  scale={scale}
                  onLogEmotion={d.key === today ? () => setModalVisible(true) : undefined}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <EmotionPickerModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={handleEmotionSelect}
      />
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
