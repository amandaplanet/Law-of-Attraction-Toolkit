import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
  getCompletedCount,
  getTodayDateKey,
  computeCompletionStats,
  PROCESS_LENGTH,
} from '../storage/thirtyDayStorage';
import { usePostHog } from 'posthog-react-native';
import { getActivityLog, logActivity } from '../storage/activityStorage';
import { getEntries } from '../storage/entriesStorage';
import { getDraft, archiveWheel, clearDraft, getArchivedWheels } from '../storage/focusWheelStorage';
import { ThirtyDayProcess, ThirtyDayEntry } from '../types';
import { EMOTION_COLORS, EMOTION_LABELS } from '../utils/reportLogic';

type Nav = StackNavigationProp<RootStackParamList>;

type PracticeStep =
  | 'loading'
  | 'emotion-before'
  | 'meditation'
  | 'meditation-done'
  | 'segment-intending'
  | 'book'
  | 'book-done'
  | 'focus-wheel'
  | 'focus-wheel-done'
  | 'emotion-after'
  | 'complete';

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

function determineStep(entry: ThirtyDayEntry): PracticeStep {
  if (entry.completed)                 return 'complete';
  if (entry.emotionBefore === null)    return 'emotion-before';
  if (!entry.meditationDone)           return 'meditation';
  if (!entry.bookDone)                 return 'segment-intending';
  if (!entry.focusWheelDone)           return 'focus-wheel';
  if (entry.emotionAfter === null)     return 'emotion-after';
  return 'complete';
}

function makeEmptyEntry(date: string): ThirtyDayEntry {
  return { date, emotionBefore: null, emotionAfter: null, meditationDone: false, bookDone: false, focusWheelDone: false, completed: false };
}

function upsertEntry(process: ThirtyDayProcess, entry: ThirtyDayEntry): ThirtyDayProcess {
  const days = [...process.days.filter((d) => d.date !== entry.date), entry];
  return { ...process, days };
}

export default function ThirtyDayPracticeScreen() {
  const navigation = useNavigation<Nav>();
  const posthog    = usePostHog();
  const [step,    setStep]    = useState<PracticeStep>('loading');
  const [process, setProcess] = useState<ThirtyDayProcess | null>(null);
  const [entry,   setEntry]   = useState<ThirtyDayEntry | null>(null);
  // Track if meditation/book nav has been triggered this session (for UX feedback)
  const didNavigateToMeditation = useRef(false);
  const didNavigateToBook       = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        const proc = await getActiveProcess();
        if (cancelled || !proc) return;

        const today = getTodayDateKey();
        let e: ThirtyDayEntry = proc.days.find((d) => d.date === today) ?? makeEmptyEntry(today);

        // Check external completions (done outside the flow today)
        if (!e.meditationDone) {
          const actLog = await getActivityLog();
          if (actLog.some((ev) => ev.type === 'meditation' && ev.timestamp.startsWith(today))) {
            e = { ...e, meditationDone: true };
          }
        }
        if (!e.bookDone) {
          const entries = await getEntries();
          if (entries.some((en) => en.createdAt.startsWith(today))) {
            e = { ...e, bookDone: true };
          }
        }
        if (!e.focusWheelDone) {
          const wheels = await getArchivedWheels();
          if (wheels.some((w) => w.archivedAt?.startsWith(today))) {
            e = { ...e, focusWheelDone: true };
          }
        }

        const newProc = upsertEntry(proc, e);
        if (!cancelled) {
          await saveActiveProcess(newProc);
          setProcess(newProc);
          setEntry(e);
          setStep((prev) => {
            if (prev === 'loading')                              return determineStep(e);
            if (prev === 'meditation'   && e.meditationDone)    return 'meditation-done';
            if (prev === 'book'         && e.bookDone)          return 'book-done';
            if (prev === 'focus-wheel'  && e.focusWheelDone)    return 'focus-wheel-done';
            return prev;
          });
        }
      }

      load();
      return () => { cancelled = true; };
    }, [])
  );

  // ── Helpers ────────────────────────────────────────────────────────────────

  const saveEntry = async (updated: ThirtyDayEntry) => {
    if (!process) return;
    const newProc = upsertEntry(process, updated);
    setProcess(newProc);
    setEntry(updated);
    await saveActiveProcess(newProc);
    return newProc;
  };

  const handleEmotionBefore = async (level: number) => {
    if (!entry || !process) return;
    await logActivity({ type: 'emotion', timestamp: new Date().toISOString(), level });
    const dayNum = getCompletedCount(process) + 1;
    posthog.capture('thirty_day_step_completed', { step: 'emotion_before', day_num: dayNum, emotion_level: level });
    const updated = { ...entry, emotionBefore: level };
    await saveEntry(updated);
    setStep(determineStep(updated));
  };

  const handleEmotionAfter = async (level: number) => {
    if (!entry || !process) return;
    await logActivity({ type: 'emotion', timestamp: new Date().toISOString(), level });
    const completedCount = getCompletedCount(process);
    const dayNum = completedCount + 1;
    const updated = { ...entry, emotionAfter: level, completed: true };
    const newProc = await saveEntry(updated);

    // Per-day event — always fire
    const emotionBefore = entry.emotionBefore;
    posthog.capture('thirty_day_day_completed', {
      day_num:       dayNum,
      emotion_before: emotionBefore,
      emotion_after:  level,
      delta:          emotionBefore !== null ? emotionBefore - level : null,
      vibration_improved: emotionBefore !== null ? level < emotionBefore : null,
    });

    if (newProc && dayNum >= PROCESS_LENGTH) {
      await finalizeProcess(newProc, 'completed');
      const stats = computeCompletionStats(newProc);
      posthog.capture('thirty_day_process_completed', {
        avg_before:         stats.avgBefore,
        avg_after:          stats.avgAfter,
        delta:              stats.avgBefore !== null && stats.avgAfter !== null
                              ? stats.avgBefore - stats.avgAfter
                              : null,
        vibration_improved: stats.avgBefore !== null && stats.avgAfter !== null
                              ? stats.avgAfter < stats.avgBefore
                              : null,
        perfect_attendance: stats.perfectAttendance,
        total_meditations:  stats.totalMeditations,
        total_book_entries: stats.totalBookEntries,
        total_focus_wheels: stats.totalFocusWheels,
      });
      navigation.replace('ThirtyDayCompletion');
    } else {
      setStep('complete');
    }
  };

  const handleMeditationDone = async () => {
    if (!entry) return;
    const updated = { ...entry, meditationDone: true };
    await saveEntry(updated);
    setStep(determineStep(updated));
  };

  const handleBookDone = async () => {
    if (!entry || !process) return;
    const dayNum = getCompletedCount(process) + 1;
    posthog.capture('thirty_day_step_completed', { step: 'book', day_num: dayNum });
    const updated = { ...entry, bookDone: true };
    await saveEntry(updated);
    setStep(determineStep(updated));
  };

  const handleFocusWheelDone = async () => {
    if (!entry) return;
    const updated = { ...entry, focusWheelDone: true };
    await saveEntry(updated);
    setStep(determineStep(updated));
  };

  const completedCount = process ? getCompletedCount(process) : 0;
  const dayNum = entry?.completed
    ? completedCount
    : completedCount + 1;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (step === 'loading' || !entry) {
    return <View style={styles.bg} />;
  }

  // ── Completion screen ──────────────────────────────────────────────────────

  if (step === 'complete') {
    const beforeIdx = entry.emotionBefore !== null ? Math.min(Math.round(entry.emotionBefore) - 1, 21) : -1;
    const afterIdx  = entry.emotionAfter  !== null ? Math.min(Math.round(entry.emotionAfter)  - 1, 21) : -1;
    const isAllDone = completedCount >= PROCESS_LENGTH;

    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.completionScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.completionStars}>✦  ✦  ✦</Text>
            <Text style={styles.completionTitle}>
              {isAllDone ? 'All 30 days complete! 🌟' : `Day ${dayNum} complete ✨`}
            </Text>
            <Text style={styles.completionBody}>
              {isAllDone
                ? 'You showed up every single day. That momentum is yours to keep, forever.'
                : 'You showed up for yourself today. Every practice builds the bridge.'}
            </Text>

            {beforeIdx >= 0 && afterIdx >= 0 && (
              <View style={styles.shiftCard}>
                <Text style={styles.shiftCardLabel}>Your shift today</Text>
                <View style={styles.shiftRow}>
                  <View style={styles.shiftItem}>
                    <View style={[styles.shiftBadge, { backgroundColor: EMOTION_COLORS[beforeIdx] }]}>
                      <Text style={styles.shiftBadgeNum}>{entry.emotionBefore}</Text>
                    </View>
                    <Text style={styles.shiftLabel}>{EMOTION_LABELS[beforeIdx]}</Text>
                    <Text style={styles.shiftSubLabel}>Before</Text>
                  </View>
                  <Text style={styles.shiftArrow}>→</Text>
                  <View style={styles.shiftItem}>
                    <View style={[styles.shiftBadge, { backgroundColor: EMOTION_COLORS[afterIdx] }]}>
                      <Text style={styles.shiftBadgeNum}>{entry.emotionAfter}</Text>
                    </View>
                    <Text style={styles.shiftLabel}>{EMOTION_LABELS[afterIdx]}</Text>
                    <Text style={styles.shiftSubLabel}>After</Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'ThirtyDayDashboard' }] })}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>View My Progress  →</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Step header ────────────────────────────────────────────────────────────

  const stepNumbers: Record<PracticeStep, string> = {
    'loading':             '',
    'emotion-before':      'Step 1 of 6',
    'meditation':          'Step 2 of 6',
    'meditation-done':     'Step 2 of 6',
    'segment-intending':   'Step 3 of 6',
    'book':                'Step 4 of 6',
    'book-done':           'Step 4 of 6',
    'focus-wheel':         'Step 5 of 6',
    'focus-wheel-done':    'Step 5 of 6',
    'emotion-after':       'Step 6 of 6',
    'complete':            '',
  };

  // ── Emotion picker (shared for before/after) ───────────────────────────────

  if (step === 'emotion-before' || step === 'emotion-after') {
    const isBefore = step === 'emotion-before';
    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.stepHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <View style={styles.stepHeaderCenter}>
              <Text style={styles.stepDay}>Day {dayNum}</Text>
              <Text style={styles.stepNum}>{stepNumbers[step]}</Text>
            </View>
            <View style={{ width: 80 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.emotionScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.emotionPrompt}>
              {isBefore
                ? 'Before you begin — where are you right now?'
                : 'After your practice — how do you feel now?'}
            </Text>

            <View style={styles.emotionList}>
              {EMOTION_FULL_LABELS.map((label, i) => {
                const level = i + 1;
                const color = EMOTION_COLORS[i];
                return (
                  <React.Fragment key={level}>
                    {level === 8 && (
                      <View style={styles.tippingPoint}>
                        <View style={styles.tippingLine} />
                        <Text style={styles.tippingText}>↑ tipping point</Text>
                        <View style={styles.tippingLine} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.emotionRow}
                      onPress={() => isBefore ? handleEmotionBefore(level) : handleEmotionAfter(level)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.levelBadge, { backgroundColor: color }]}>
                        <Text style={styles.levelNum}>{level}</Text>
                      </View>
                      <Text style={styles.emotionLabel}>{label}</Text>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── Segment intending ─────────────────────────────────────────────────────

  if (step === 'segment-intending') {
    return (
      <View style={styles.bg}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.stepHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>‹ Back</Text>
            </TouchableOpacity>
            <View style={styles.stepHeaderCenter}>
              <Text style={styles.stepDay}>Day {dayNum}</Text>
              <Text style={styles.stepNum}>{stepNumbers[step]}</Text>
            </View>
            <View style={{ width: 80 }} />
          </View>

          <View style={styles.toolStepWrap}>
            <View style={styles.toolCard}>
              <Text style={styles.toolEmoji}>💫</Text>
              <Text style={styles.toolTitle}>Segment Intending</Text>
              <Text style={styles.toolBody}>
                Before you write, take a moment to look for things to appreciate.
                Notice what's already good. Let easy, good-feeling thoughts flow —
                small ones count. You're setting the stage for what comes next.
              </Text>
              <TouchableOpacity
                style={styles.openToolBtn}
                onPress={() => {
                  posthog.capture('thirty_day_step_completed', { step: 'segment_intending', day_num: dayNum });
                  setStep('book');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.openToolBtnText}>I'm ready  →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Tool steps (meditation / book) ─────────────────────────────────────────

  type StepConfig = {
    emoji: string;
    title: string;
    body: string;
    doneTitle: string;
    doneBody: string;
    btnLabel: string;
    onNavigate: () => void;
    onManualDone: () => void;
    onContinue: () => void;
  };

  const stepConfig: Partial<Record<PracticeStep, StepConfig>> = {
    'meditation': {
      emoji: '🧘',
      title: 'Morning Meditation',
      body: 'Find a comfortable position, close your eyes, and breathe. Release all thought and let Source fill the space. Any length is perfect.',
      doneTitle: 'Meditation complete',
      doneBody: 'Take a breath and notice how you feel.',
      btnLabel: 'Open Meditation',
      onNavigate: () => {
        didNavigateToMeditation.current = true;
        posthog.capture('thirty_day_step_completed', { step: 'meditation_started', day_num: dayNum });
        navigation.navigate('Meditation', { source: '30_day' });
      },
      onManualDone: handleMeditationDone,
      onContinue: () => setStep('book'),
    },
    'meditation-done': {
      emoji: '🧘',
      title: 'Morning Meditation',
      body: '',
      doneTitle: 'Meditation complete ✓',
      doneBody: 'Take a breath and notice how you feel.',
      btnLabel: '',
      onNavigate: () => {},
      onManualDone: handleMeditationDone,
      onContinue: () => setStep('segment-intending'),
    },
    'book': {
      emoji: '📖',
      title: 'Book of Positive Aspects',
      body: 'Choose a subject — a person, a place, a dream — and write what you genuinely appreciate about it. Let each thought lead to the next.',
      doneTitle: 'Positive aspects complete',
      doneBody: 'Your focus is trained on what is wanted.',
      btnLabel: 'Open Book of Positive Aspects',
      onNavigate: () => {
        didNavigateToBook.current = true;
        navigation.navigate('CreateEntry', { goBackOnDone: true });
      },
      onManualDone: handleBookDone,
      onContinue: () => setStep('emotion-after'),
    },
    'book-done': {
      emoji: '📖',
      title: 'Book of Positive Aspects',
      body: '',
      doneTitle: 'Positive aspects complete ✓',
      doneBody: 'Your focus is trained on what is wanted.',
      btnLabel: '',
      onNavigate: () => {},
      onManualDone: handleBookDone,
      onContinue: () => setStep('focus-wheel'),
    },
    'focus-wheel': {
      emoji: '🎯',
      title: 'Focus Wheel',
      body: 'Choose a desire and build 12 statements of genuine belief around it. Each spoke raises your vibration toward it.',
      doneTitle: 'Focus Wheel complete',
      doneBody: 'You have aligned with what you want.',
      btnLabel: 'Open Focus Wheel',
      onNavigate: async () => {
        const draft = await getDraft();
        if (draft) {
          const hasContent = draft.centerStatement.trim() ||
            draft.spokes.some((s) => s.text.trim());
          if (hasContent) {
            await archiveWheel(draft);
          } else {
            await clearDraft();
          }
        }
        posthog.capture('thirty_day_step_completed', { step: 'focus_wheel_started', day_num: dayNum });
        navigation.navigate('FocusWheel', { source: '30_day' });
      },
      onManualDone: handleFocusWheelDone,
      onContinue: () => setStep('emotion-after'),
    },
    'focus-wheel-done': {
      emoji: '🎯',
      title: 'Focus Wheel',
      body: '',
      doneTitle: 'Focus Wheel complete ✓',
      doneBody: 'You have aligned with what you want.',
      btnLabel: '',
      onNavigate: () => {},
      onManualDone: handleFocusWheelDone,
      onContinue: () => setStep('emotion-after'),
    },
  };

  const cfg = stepConfig[step];
  if (!cfg) return null;

  const isDone = step === 'meditation-done' || step === 'book-done' || step === 'focus-wheel-done';

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.stepHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.stepHeaderCenter}>
            <Text style={styles.stepDay}>Day {dayNum}</Text>
            <Text style={styles.stepNum}>{stepNumbers[step]}</Text>
          </View>
          <View style={{ width: 80 }} />
        </View>

        <View style={styles.toolStepWrap}>
          <View style={[styles.toolCard, isDone && styles.toolCardDone]}>
            <Text style={styles.toolEmoji}>{cfg.emoji}</Text>

            {isDone ? (
              <>
                <Text style={styles.toolDoneTitle}>{cfg.doneTitle}</Text>
                <Text style={styles.toolDoneBody}>{cfg.doneBody}</Text>
                <TouchableOpacity style={styles.continueBtn} onPress={cfg.onContinue} activeOpacity={0.85}>
                  <Text style={styles.continueBtnText}>Continue  →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.toolTitle}>{cfg.title}</Text>
                <Text style={styles.toolBody}>{cfg.body}</Text>
                <TouchableOpacity style={styles.openToolBtn} onPress={cfg.onNavigate} activeOpacity={0.85}>
                  <Text style={styles.openToolBtnText}>{cfg.btnLabel}  →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.alreadyDoneBtn} onPress={cfg.onManualDone} activeOpacity={0.7}>
                  <Text style={styles.alreadyDoneBtnText}>I've already done this  ✓</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: '#FAF5FF' },
  safe: { flex: 1 },

  // Step header
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn:  { padding: 8, width: 80 },
  backText: { fontSize: 20, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
  stepHeaderCenter: { alignItems: 'center' },
  stepDay: {
    fontSize: 16,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
  },
  stepNum: {
    fontSize: 12,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
    marginTop: 1,
  },

  // Emotion picker
  emotionScroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emotionPrompt: {
    fontSize: 18,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
    lineHeight: 26,
  },
  emotionList: { gap: 7 },
  emotionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(123,79,166,0.12)',
    backgroundColor: '#fff',
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
  emotionLabel: {
    flex: 1,
    fontSize: 15,
    color: '#4A3060',
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
    backgroundColor: 'rgba(123,79,166,0.15)',
  },
  tippingText: {
    fontSize: 12,
    color: 'rgba(123,79,166,0.45)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },

  // Tool step
  toolStepWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  toolCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,79,166,0.1)',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toolCardDone: {
    borderColor: 'rgba(123,79,166,0.3)',
    backgroundColor: '#F5EEFF',
  },
  toolEmoji: { fontSize: 52 },
  toolTitle: {
    fontSize: 22,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  toolBody: {
    fontSize: 16,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    textAlign: 'center',
  },
  openToolBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    marginTop: 4,
    width: '100%',
    alignItems: 'center',
  },
  openToolBtnText: {
    fontSize: 16,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
  },
  alreadyDoneBtn: {
    paddingVertical: 8,
  },
  alreadyDoneBtnText: {
    fontSize: 14,
    color: 'rgba(123,79,166,0.45)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  toolDoneTitle: {
    fontSize: 22,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  toolDoneBody: {
    fontSize: 16,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  continueBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 4,
    width: '100%',
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 16,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
  },

  // Completion
  completionScroll: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 20,
  },
  completionStars: {
    fontSize: 16,
    color: 'rgba(123,79,166,0.4)',
    letterSpacing: 8,
  },
  completionTitle: {
    fontSize: 28,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    textAlign: 'center',
    lineHeight: 44,
    paddingTop: 6,
  },
  completionBody: {
    fontSize: 17,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
    textAlign: 'center',
  },
  shiftCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(123,79,166,0.1)',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  shiftCardLabel: {
    fontSize: 13,
    color: '#9B72CC',
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  shiftItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shiftBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shiftBadgeNum: {
    fontSize: 18,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
  shiftLabel: {
    fontSize: 13,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  shiftSubLabel: {
    fontSize: 11,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
  },
  shiftArrow: {
    fontSize: 20,
    color: '#9B72CC',
    flexShrink: 0,
  },
  doneBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 40,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    marginTop: 8,
  },
  doneBtnText: {
    fontSize: 17,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
  },
});
