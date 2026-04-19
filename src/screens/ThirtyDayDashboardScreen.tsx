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
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getActiveProcess,
  saveActiveProcess,
  finalizeProcess,
  makeNewProcess,
  getCompletedCount,
  getTodayEntry,
  getDaysMissed,
  getTodayDateKey,
  PROCESS_LENGTH,
} from '../storage/thirtyDayStorage';
import { ThirtyDayProcess } from '../types';
import { EMOTION_COLORS, EMOTION_LABELS } from '../utils/reportLogic';
import { usePostHog } from 'posthog-react-native';

type Nav = StackNavigationProp<RootStackParamList>;

type CircleState = 'done' | 'active' | 'future';

function getCircleState(i: number, completedCount: number, todayDone: boolean): CircleState {
  if (i <= completedCount) return 'done';
  if (i === completedCount + 1 && !todayDone) return 'active';
  return 'future';
}

export default function ThirtyDayDashboardScreen() {
  const navigation = useNavigation<Nav>();
  const posthog    = usePostHog();
  const { width } = useWindowDimensions();
  const [process, setProcess] = useState<ThirtyDayProcess | null>(null);
  const [loaded,  setLoaded]  = useState(false);

  useFocusEffect(
    useCallback(() => {
      getActiveProcess().then((p) => { setProcess(p); setLoaded(true); });
    }, [])
  );

  // Circle size: 6 per row, 6px gap
  const circleSize = Math.floor((width - 40 - 5 * 8) / 6);

  if (!loaded) return <View style={styles.bg} />;

  if (!process) {
    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{PROCESS_LENGTH}-Day Practice</Text>
            <View style={{ width: 80 }} />
          </View>
          <View style={styles.noProcessWrap}>
            <TouchableOpacity
              style={styles.beginBtn}
              onPress={() => navigation.replace('ThirtyDayIntro')}
              activeOpacity={0.85}
            >
              <Text style={styles.beginBtnText}>Start a New Practice</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const completedCount = getCompletedCount(process);
  const todayEntry = getTodayEntry(process);
  const todayDone = todayEntry?.completed ?? false;
  const daysMissed = getDaysMissed(process);
  const needsRestart = daysMissed > 3;
  const currentDayNum = Math.min(completedCount + (todayDone ? 0 : 1), PROCESS_LENGTH);
  const progress = completedCount / PROCESS_LENGTH;

  const handleStartFresh = async () => {
    posthog.capture('thirty_day_process_abandoned', {
      days_completed: completedCount,
      days_missed:    daysMissed,
    });
    await finalizeProcess(process, 'abandoned');
    const fresh = makeNewProcess();
    await saveActiveProcess(fresh);
    setProcess(fresh);
  };

  // ── Restart state ──────────────────────────────────────────────────────────

  if (needsRestart) {
    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{PROCESS_LENGTH}-Day Practice</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ThirtyDayIntro', { readOnly: true })}
              style={styles.infoBtn}
            >
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.restartScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.restartStars}>✦  ✦  ✦</Text>
            <Text style={styles.restartTitle}>It's been a little while.</Text>
            <Text style={styles.restartBody}>
              Life got full — and that's perfectly okay. Every step you took is{' '}
              yours to keep. The days you showed up for yourself still count.
            </Text>
            {completedCount > 0 && (
              <View style={styles.restartBadge}>
                <Text style={styles.restartBadgeNum}>{completedCount}</Text>
                <Text style={styles.restartBadgeLabel}>
                  {completedCount === 1 ? 'day' : 'days'} completed
                </Text>
              </View>
            )}
            <Text style={styles.restartBody}>
              Whenever you feel the call to align again, a fresh start is always
              waiting for you.
            </Text>
            <TouchableOpacity style={styles.restartBtn} onPress={handleStartFresh} activeOpacity={0.85}>
              <Text style={styles.restartBtnText}>Begin Again  ✦</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Normal dashboard ───────────────────────────────────────────────────────

  const todayEmotionBefore = todayEntry?.emotionBefore;
  const todayEmotionAfter  = todayEntry?.emotionAfter;
  const inProgress = todayEntry && !todayDone;

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{PROCESS_LENGTH}-Day Practice</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ThirtyDayIntro', { readOnly: true })}
              style={styles.infoBtn}
            >
              <Text style={styles.infoBtnText}>i</Text>
            </TouchableOpacity>
          </View>

          {/* Day counter */}
          <View style={styles.dayCounterRow}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayBadgeNum}>{currentDayNum}</Text>
              <Text style={styles.dayBadgeOf}>of {PROCESS_LENGTH}</Text>
            </View>
            <View style={styles.dayCounterText}>
              <Text style={styles.dayLabel}>
                {completedCount >= PROCESS_LENGTH ? `All ${PROCESS_LENGTH} days complete!` : todayDone ? `Day ${completedCount} complete` : `Day ${currentDayNum}`}
              </Text>
              <Text style={styles.daySubLabel}>Your Morning Ritual</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{completedCount} of {PROCESS_LENGTH} days complete</Text>

          {/* Grid */}
          <View style={styles.grid}>
            {Array.from({ length: PROCESS_LENGTH }, (_, i) => {
              const num = i + 1;
              const state = getCircleState(num, completedCount, todayDone);
              return (
                <View
                  key={num}
                  style={[
                    styles.circle,
                    { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
                    state === 'done'   && styles.circleDone,
                    state === 'active' && styles.circleActive,
                    state === 'future' && styles.circleFuture,
                  ]}
                >
                  {state === 'done' ? (
                    <Text style={styles.circleCheck}>✓</Text>
                  ) : (
                    <Text style={[
                      styles.circleNum,
                      state === 'active' && styles.circleNumActive,
                    ]}>
                      {num}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Today card */}
          {completedCount < PROCESS_LENGTH && (
            <View style={styles.todayCard}>
              <Text style={styles.todayCardTitle}>Today's Practice</Text>

              {todayDone ? (
                // Completed today
                <View style={styles.todayDoneWrap}>
                  <Text style={styles.todayDoneCheck}>✓</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.todayDoneText}>Practice complete</Text>
                    {todayEmotionBefore !== null && todayEmotionBefore !== undefined &&
                     todayEmotionAfter  !== null && todayEmotionAfter  !== undefined && (
                      <View style={styles.emotionShiftRow}>
                        <EmotionPill level={todayEmotionBefore} />
                        <Text style={styles.shiftArrow}>→</Text>
                        <EmotionPill level={todayEmotionAfter} />
                      </View>
                    )}
                  </View>
                </View>
              ) : (
                // Not yet done
                <TouchableOpacity
                  style={styles.beginBtn}
                  onPress={() => navigation.navigate('ThirtyDayPractice')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.beginBtnText}>
                    {inProgress ? "Continue today's practice  →" : "Begin today's practice  →"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* All done state */}
          {completedCount >= PROCESS_LENGTH && (
            <View style={styles.allDoneCard}>
              <Text style={styles.allDoneEmoji}>🌟</Text>
              <Text style={styles.allDoneTitle}>{PROCESS_LENGTH} Days Complete!</Text>
              <Text style={styles.allDoneBody}>
                You showed up every day for yourself. That momentum is yours forever.
              </Text>
              <TouchableOpacity
                style={styles.beginAgainBtn}
                onPress={() => navigation.navigate('ThirtyDayIntro')}
                activeOpacity={0.85}
              >
                <Text style={styles.beginAgainText}>Begin Another {PROCESS_LENGTH} Days</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function EmotionPill({ level }: { level: number }) {
  const idx   = Math.min(Math.round(level) - 1, 21);
  const color = EMOTION_COLORS[idx];
  const label = EMOTION_LABELS[idx];
  return (
    <View style={[pillStyles.pill, { backgroundColor: color + '33', borderColor: color }]}>
      <Text style={[pillStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  pill: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: 'Nunito_700Bold',
  },
});

const styles = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: '#FAF5FF' },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn:     { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#2E1A47', fontFamily: 'Pacifico_400Regular', lineHeight: 32, paddingTop: 4 },
  infoBtn: {
    width: 80,
    alignItems: 'flex-end',
    padding: 8,
  },
  infoBtnText: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#9B72CC',
    textAlign: 'center',
    lineHeight: 23,
    fontSize: 14,
    color: '#9B72CC',
    fontFamily: 'Nunito_700Bold',
    fontStyle: 'italic',
  },

  // Day counter
  dayCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  dayBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#7B4FA6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  dayBadgeNum: {
    fontSize: 24,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 28,
  },
  dayBadgeOf: {
    fontSize: 11,
    color: 'rgba(243,232,255,0.65)',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 14,
  },
  dayCounterText: { flex: 1 },
  dayLabel: {
    fontSize: 20,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 24,
  },
  daySubLabel: {
    fontSize: 13,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },

  // Progress bar
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(123,79,166,0.12)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7B4FA6',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 12,
    color: '#7B5FA0',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'right',
    marginBottom: 20,
  },

  // Grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#7B4FA6',
  },
  circleActive: {
    backgroundColor: 'rgba(123,79,166,0.15)',
    borderWidth: 2,
    borderColor: '#B08AD4',
  },
  circleFuture: {
    backgroundColor: 'rgba(123,79,166,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(123,79,166,0.15)',
  },
  circleCheck: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
  circleNum: {
    fontSize: 12,
    color: 'rgba(123,79,166,0.3)',
    fontFamily: 'Nunito_700Bold',
  },
  circleNumActive: {
    color: '#7B4FA6',
  },

  // Today card
  todayCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  todayCardTitle: {
    fontSize: 15,
    color: '#9B72CC',
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  todayDoneWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  todayDoneCheck: {
    fontSize: 22,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 28,
  },
  todayDoneText: {
    fontSize: 17,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 8,
  },
  emotionShiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shiftArrow: {
    fontSize: 14,
    color: '#7B5FA0',
  },
  beginBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  beginBtnText: {
    fontSize: 16,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
  },

  // All done
  allDoneCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  allDoneEmoji:  { fontSize: 48 },
  allDoneTitle:  { fontSize: 24, color: '#2E1A47', fontFamily: 'Nunito_700Bold' },
  allDoneBody:   { fontSize: 16, color: '#5A3A7A', fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 24 },
  beginAgainBtn: { backgroundColor: '#7B4FA6', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8 },
  beginAgainText:{ fontSize: 16, color: '#F3E8FF', fontFamily: 'Nunito_700Bold' },

  // Restart
  restartScroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  restartStars: {
    fontSize: 16,
    color: 'rgba(123,79,166,0.4)',
    letterSpacing: 8,
    marginTop: 24,
  },
  restartTitle: {
    fontSize: 28,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    textAlign: 'center',
    lineHeight: 44,
    paddingTop: 6,
  },
  restartBody: {
    fontSize: 17,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
    textAlign: 'center',
  },
  restartBadge: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(123,79,166,0.15)',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  restartBadgeNum: {
    fontSize: 40,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 44,
  },
  restartBadgeLabel: {
    fontSize: 14,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
  },
  restartBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  restartBtnText: {
    fontSize: 18,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
  },

  noProcessWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
});
