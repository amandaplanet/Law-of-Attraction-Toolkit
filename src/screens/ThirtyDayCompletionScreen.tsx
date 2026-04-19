import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { EMOTION_COLORS, EMOTION_LABELS } from '../utils/reportLogic';
import {
  getLastCompletedProcess,
  getCompletedProcesses,
  computeCompletionStats,
  makeNewProcess,
  saveActiveProcess,
  CompletionStats,
} from '../storage/thirtyDayStorage';

type Nav = StackNavigationProp<RootStackParamList>;

// ── Slide backgrounds ─────────────────────────────────────────────────────────

const SLIDE_BG = [
  '#1A0A2E',  // 1 – achievement: deep purple
  '#0A1A35',  // 2 – practice: midnight blue
  '#1A0A2E',  // 3 – shift: deep purple
  '#0F1A20',  // 4 – best day: dark teal-black
  '#12072A',  // 5 – badges: richest dark
  '#FAF5FF',  // 6 – what's next: light (contrast payoff)
];

const TOTAL_SLIDES = 6;

// ── Helper: pick slide 3 copy based on average shift ─────────────────────────

function getShiftCopy(avgBefore: number, avgAfter: number) {
  const delta = avgBefore - avgAfter; // positive = improved (lower # = higher vibe)
  if (delta >= 3) {
    return { kicker: 'Your shift',       title: 'Every morning,\nyou moved the needle.' };
  } else if (delta >= 1) {
    return { kicker: 'Your shift',       title: 'Every morning,\nyou lifted yourself higher.' };
  } else if (delta >= -1) {
    return { kicker: 'Your baseline',    title: 'You were already\nflying high.' };
  } else {
    return { kicker: 'Your consistency', title: 'You showed up,\nevery single morning.' };
  }
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function EmotionBadge({ level, size = 64 }: { level: number; size?: number }) {
  const idx   = Math.min(Math.round(level) - 1, 21);
  const color = EMOTION_COLORS[idx];
  const label = EMOTION_LABELS[idx];
  const isDark = idx >= 15;
  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <View style={[
        badgeStyles.circle,
        {
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: color,
          shadowColor: color,
        },
      ]}>
        <Text style={[badgeStyles.num, { fontSize: size * 0.32, color: isDark ? '#fff' : 'rgba(0,0,0,0.75)' }]}>
          {level}
        </Text>
      </View>
      <Text style={badgeStyles.label}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  num: {
    fontFamily: 'Nunito_700Bold',
  },
  label: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
});

// ── Badge component ───────────────────────────────────────────────────────────

function BadgeMedal({
  emoji,
  color,
  glowColor,
  title,
  subtitle,
  count,
}: {
  emoji: string;
  color: string;
  glowColor: string;
  title: string;
  subtitle: string;
  count?: number;
}) {
  return (
    <View style={medalStyles.wrap}>
      <View>
        <View style={[medalStyles.circle, { backgroundColor: color, shadowColor: glowColor }]}>
          <Text style={medalStyles.emoji}>{emoji}</Text>
        </View>
        {count != null && count > 1 && (
          <View style={medalStyles.countBubble}>
            <Text style={medalStyles.countText}>{count}</Text>
          </View>
        )}
      </View>
      <Text style={medalStyles.title}>{title}</Text>
      <Text style={medalStyles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const medalStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  emoji:    { fontSize: 40 },
  title:    { fontSize: 14, color: '#fff', fontFamily: 'Nunito_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 16 },
  countBubble: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#1A0A2E',
  },
  countText: {
    fontSize: 12,
    color: '#1A0A2E',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 14,
  },
});

// ── Progress dots ─────────────────────────────────────────────────────────────

function Dots({ current, isLight }: { current: number; isLight: boolean }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === current && dotStyles.dotActive,
            isLight
              ? (i === current ? dotStyles.dotActiveDark : dotStyles.dotInactiveDark)
              : (i === current ? dotStyles.dotActiveLight : dotStyles.dotInactiveLight),
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row:              { flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 12 },
  dot:              { height: 4, borderRadius: 2 },
  dotActive:        { width: 20 },
  dotActiveLight:   { backgroundColor: '#fff' },
  dotActiveDark:    { backgroundColor: '#7B4FA6' },
  dotInactiveLight: { width: 6, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotInactiveDark:  { width: 6, backgroundColor: 'rgba(123,79,166,0.3)' },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ThirtyDayCompletionScreen() {
  const navigation = useNavigation<Nav>();
  const [slide, setSlide] = useState(0);
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [completionCount, setCompletionCount] = useState(1);

  useEffect(() => {
    getLastCompletedProcess().then((proc) => {
      if (proc) setStats(computeCompletionStats(proc));
    });
    getCompletedProcesses().then((procs) => setCompletionCount(procs.length));
  }, []);

  const isLastSlide  = slide === TOTAL_SLIDES - 1;
  const isLightSlide = slide === TOTAL_SLIDES - 1;

  const advance = () => {
    if (!isLastSlide) setSlide((s) => s + 1);
  };

  const handleBeginRound2 = async () => {
    const fresh = makeNewProcess();
    await saveActiveProcess(fresh);
    navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'ThirtyDayDashboard' }] });
  };

  // Slide 3 data
  const shiftCopy = stats?.avgBefore != null && stats?.avgAfter != null
    ? getShiftCopy(stats.avgBefore, stats.avgAfter)
    : { kicker: 'Your consistency', title: 'You showed up,\nevery single morning.' };
  const hasShift = stats?.avgBefore != null && stats?.avgAfter != null
    && (stats.avgBefore - stats.avgAfter) >= 1;

  // Slide 4 data
  const hasBestDay = stats?.bestDayBefore != null && stats?.bestDayAfter != null && stats?.bestDayLabel != null;

  return (
    <View style={[styles.bg, { backgroundColor: SLIDE_BG[slide] }]}>
      <SafeAreaView style={styles.safe}>
        <Dots current={slide} isLight={isLightSlide} />

        <TouchableOpacity
          style={styles.slideArea}
          onPress={advance}
          activeOpacity={isLastSlide ? 1 : 0.97}
        >

          {/* ── Slide 1: Achievement ── */}
          {slide === 0 && (
            <View style={styles.slide}>
              <Text style={styles.s1Kicker}>30 days.</Text>
              <Text style={styles.s1BigNum}>30</Text>
              <Text style={styles.s1Sub}>days of practice{'\n'}complete.</Text>
              <View style={styles.dividerLight} />
              <Text style={styles.s1Body}>
                You showed up for yourself,{'\n'}every single morning.
              </Text>
              <Text style={styles.tapHint}>tap to continue</Text>
            </View>
          )}

          {/* ── Slide 2: Practice ── */}
          {slide === 1 && (
            <View style={styles.slide}>
              <Text style={styles.s2Kicker}>Your practice</Text>
              <View style={styles.s2Row}>
                <Text style={styles.s2Emoji}>🧘</Text>
                <View>
                  <Text style={styles.s2BigNum}>{stats?.totalMeditations ?? 0}</Text>
                  <Text style={styles.s2Label}>meditations</Text>
                </View>
              </View>
              <View style={styles.s2Row}>
                <Text style={styles.s2Emoji}>📖</Text>
                <View>
                  <Text style={styles.s2BigNum}>{stats?.totalBookEntries ?? 0}</Text>
                  <Text style={styles.s2Label}>pages of positive aspects</Text>
                </View>
              </View>
              <View style={styles.s2Row}>
                <Text style={styles.s2Emoji}>🎯</Text>
                <View>
                  <Text style={styles.s2BigNum}>{stats?.totalFocusWheels ?? 0}</Text>
                  <Text style={styles.s2Label}>focus wheels</Text>
                </View>
              </View>
              <View style={styles.dividerLight} />
              <Text style={styles.s2Total}>
                {(stats?.totalMeditations ?? 0) + (stats?.totalBookEntries ?? 0) + (stats?.totalFocusWheels ?? 0)} intentional acts of alignment.
              </Text>
            </View>
          )}

          {/* ── Slide 3: Your Shift ── */}
          {slide === 2 && (
            <View style={styles.slide}>
              <Text style={styles.s3Kicker}>{shiftCopy.kicker}</Text>
              <Text style={styles.s3Title}>{shiftCopy.title}</Text>
              {stats?.avgBefore != null && stats?.avgAfter != null ? (
                hasShift ? (
                  <View style={styles.shiftRow}>
                    <View style={styles.shiftItem}>
                      <Text style={styles.shiftWhen}>Before</Text>
                      <EmotionBadge level={stats.avgBefore} size={72} />
                    </View>
                    <Text style={styles.shiftArrow}>→</Text>
                    <View style={styles.shiftItem}>
                      <Text style={styles.shiftWhen}>After</Text>
                      <EmotionBadge level={stats.avgAfter} size={72} />
                    </View>
                  </View>
                ) : (
                  <View style={[styles.shiftItem, { flex: 0 }]}>
                    <Text style={styles.shiftWhen}>Average</Text>
                    <EmotionBadge level={stats.avgAfter} size={88} />
                  </View>
                )
              ) : null}
              <Text style={styles.s3Sub}>Average across all 30 days</Text>
            </View>
          )}

          {/* ── Slide 4: Best Day ── */}
          {slide === 3 && (
            <View style={styles.slide}>
              {hasBestDay ? (
                <>
                  <Text style={styles.s4Kicker}>Your biggest shift</Text>
                  <Text style={styles.s4Date}>{stats!.bestDayLabel}</Text>
                  <View style={styles.shiftRow}>
                    <View style={styles.shiftItem}>
                      <Text style={styles.shiftWhen}>Before</Text>
                      <EmotionBadge level={stats!.bestDayBefore!} size={72} />
                    </View>
                    <Text style={styles.shiftArrow}>→</Text>
                    <View style={styles.shiftItem}>
                      <Text style={styles.shiftWhen}>After</Text>
                      <EmotionBadge level={stats!.bestDayAfter!} size={72} />
                    </View>
                  </View>
                  <View style={styles.deltaRow}>
                    <Text style={styles.deltaNum}>+{stats!.bestDayBefore! - stats!.bestDayAfter!}</Text>
                    <Text style={styles.deltaLabel}> levels up the scale</Text>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.s4Kicker}>Your practice</Text>
                  <Text style={styles.s3Title}>30 mornings.{'\n'}30 acts of alignment.</Text>
                </>
              )}
            </View>
          )}

          {/* ── Slide 5: Badges ── */}
          {slide === 4 && (
            <View style={styles.slide}>
              <Text style={styles.s5Kicker}>You've earned</Text>
              <View style={styles.badgesRow}>
                <BadgeMedal
                  emoji="✦"
                  color="#7B4FA6"
                  glowColor="#B08AD4"
                  title="30-Day Practitioner"
                  subtitle="Completed the full 30-day morning practice"
                  count={completionCount}
                />
                {stats?.perfectAttendance && (
                  <BadgeMedal
                    emoji="⭐"
                    color="#B8860B"
                    glowColor="#FFD700"
                    title="Unbroken Momentum"
                    subtitle="Perfect 30-day process attendance"
                    count={completionCount}
                  />
                )}
              </View>
            </View>
          )}

          {/* ── Slide 6: What's Next ── */}
          {slide === 5 && (
            <View style={styles.slide}>
              <Text style={styles.s6Kicker}>What's next</Text>
              <Text style={styles.s6Title}>The momentum{'\n'}is yours.</Text>
              <Text style={styles.s6Body}>
                Every practice you completed is woven into your vibration.
                It doesn't end here.
              </Text>
            </View>
          )}

        </TouchableOpacity>

        {/* Last slide buttons */}
        {isLastSlide && (
          <View style={styles.finalBtns}>
            <TouchableOpacity
              style={styles.beginAgainBtn}
              onPress={handleBeginRound2}
              activeOpacity={0.85}
            >
              <Text style={styles.beginAgainText}>Begin Round 2  ✦</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'Report' }] })}
              activeOpacity={0.85}
            >
              <Text style={styles.returnText}>Return to My Journey</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:   { flex: 1 },
  safe: { flex: 1 },
  slideArea: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 20,
  },

  // Slide 1
  s1Kicker: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  s1BigNum: {
    fontSize: 128,
    color: '#FFD700',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 140,
    textShadowColor: 'rgba(255,215,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  s1Sub: {
    fontSize: 22,
    color: '#E8D5F5',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 32,
  },
  s1Body: {
    fontSize: 18,
    color: 'rgba(232,213,245,0.7)',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 28,
  },
  tapHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.2)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    marginTop: 12,
  },

  // Slide 2
  s2Kicker: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  s2Row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    alignSelf: 'flex-start',
  },
  s2Emoji:  { fontSize: 44 },
  s2BigNum: {
    fontSize: 72,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 80,
  },
  s2Label: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.55)',
    fontFamily: 'Nunito_400Regular',
  },
  s2Total: {
    fontSize: 19,
    color: '#B08AD4',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 28,
  },

  // Slide 3 & 4 (shared shift layout)
  s3Kicker: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  s3Title: {
    fontSize: 26,
    color: '#E8D5F5',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 34,
  },
  s3Sub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },

  // Slide 4
  s4Kicker: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  s4Date: {
    fontSize: 32,
    color: '#E8D5F5',
    fontFamily: 'Nunito_700Bold',
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  deltaNum: {
    fontSize: 44,
    color: EMOTION_COLORS[2],
    fontFamily: 'Nunito_700Bold',
    lineHeight: 52,
  },
  deltaLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    fontFamily: 'Nunito_400Regular',
  },

  // Shared shift layout
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  shiftItem: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shiftWhen: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shiftArrow: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.3)',
    flexShrink: 0,
  },

  // Slide 5
  s5Kicker: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 24,
    paddingHorizontal: 8,
    marginTop: 8,
  },

  // Slide 6 (light bg)
  s6Kicker: {
    fontSize: 15,
    color: 'rgba(123,79,166,0.5)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  s6Title: {
    fontSize: 42,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    textAlign: 'center',
    lineHeight: 60,
    paddingTop: 8,
  },
  s6Body: {
    fontSize: 17,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 26,
  },

  // Shared
  dividerLight: {
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  // Final buttons
  finalBtns: {
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 12,
  },
  beginAgainBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  beginAgainText: {
    fontSize: 17,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
  },
  returnBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  returnText: {
    fontSize: 16,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
  },
});
