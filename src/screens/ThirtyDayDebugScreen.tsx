/**
 * DEV-ONLY screen for seeding 30-day process state.
 * Accessible by long-pressing the header title on ThirtyDayDashboardScreen.
 * Only rendered in __DEV__ builds.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  saveActiveProcess,
  PROCESS_LENGTH,
  getTodayDateKey,
} from '../storage/thirtyDayStorage';
import { getActivityLog } from '../storage/activityStorage';
import { getEntries } from '../storage/entriesStorage';
import { getArchivedWheels } from '../storage/focusWheelStorage';
import { ThirtyDayProcess, ThirtyDayEntry } from '../types';

const ACTIVITY_KEY      = '@activity_log';
const ENTRIES_KEY       = '@positive_aspects_entries';
const WHEEL_ARCHIVE_KEY = '@focus_wheel_archive';

type Nav = StackNavigationProp<RootStackParamList>;

const ACTIVE_KEY  = '@thirty_day_active';
const HISTORY_KEY = '@thirty_day_history';

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function pastDateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function makeEntry(daysAgo: number, overrides: Partial<ThirtyDayEntry> = {}): ThirtyDayEntry {
  return {
    date: pastDateKey(daysAgo),
    emotionBefore: 14,
    emotionAfter: 9,
    meditationDone: true,
    bookDone: true,
    focusWheelDone: true,
    completed: true,
    ...overrides,
  };
}

// ── Scenario builders ────────────────────────────────────────────────────────

function buildProcess(entries: ThirtyDayEntry[], startDaysAgo: number): ThirtyDayProcess {
  const start = new Date();
  start.setDate(start.getDate() - startDaysAgo);
  return {
    id: makeId(),
    startedAt: start.toISOString(),
    days: entries,
  };
}

const SCENARIOS: {
  label: string;
  description: string;
  color: string;
  build: () => { active?: ThirtyDayProcess; history?: ThirtyDayProcess[] };
}[] = [
  {
    label: 'Day 2 done',
    description: 'In progress, 2 days complete. Next: Day 3.',
    color: '#5A8FAA',
    build: () => ({
      active: buildProcess(
        [makeEntry(1), makeEntry(0, { date: pastDateKey(0) })],
        2,
      ),
    }),
  },
  {
    label: 'Day 29 done — 1 gap (Day 5 skipped)',
    description: 'Ready to complete Day 30. Should earn 30-Day badge but NOT perfect attendance.',
    color: '#7B4FA6',
    build: () => {
      // 30 calendar days starting 30 days ago.
      // Days 1-4 (30,29,28,27 ago), skip day 5 (26 ago), days 5-29 (25 to 1 ago).
      const entries: ThirtyDayEntry[] = [];
      for (let i = 0; i < 4; i++) entries.push(makeEntry(30 - i));          // days 1-4
      for (let i = 0; i < 25; i++) entries.push(makeEntry(25 - i));         // days 5-29 (skip day 5 slot)
      return { active: buildProcess(entries, 30) };
    },
  },
  {
    label: 'Day 29 done — perfect run',
    description: 'Ready to complete Day 30. Should earn BOTH badges.',
    color: '#7B4FA6',
    build: () => {
      const entries: ThirtyDayEntry[] = [];
      for (let i = PROCESS_LENGTH - 1; i >= 1; i--) entries.push(makeEntry(i));
      return { active: buildProcess(entries, PROCESS_LENGTH) };
    },
  },
  {
    label: 'Missed 1 day — grace period OK',
    description: 'Last practice was 2 days ago (1 day missed). Dashboard should show "Begin today\'s practice," NOT the restart screen.',
    color: '#4A9A6A',
    build: () => ({
      active: buildProcess(
        [makeEntry(3), makeEntry(2)],
        4,
      ),
    }),
  },
  {
    label: 'Missed 3 days — grace period edge (still OK)',
    description: 'Last practice was 4 days ago (3 days missed — the maximum allowed). Dashboard should still show "Begin today\'s practice," NOT the restart screen.',
    color: '#B07A30',
    build: () => ({
      active: buildProcess(
        [makeEntry(5), makeEntry(4)],
        6,
      ),
    }),
  },
  {
    label: 'Reverse-order entries — grace period still works',
    description: 'Entries stored newest-first (simulates data from older app versions). Last real practice was 2 days ago. Without the sort fix this would show the restart screen incorrectly.',
    color: '#4A8AAA',
    build: () => ({
      active: buildProcess(
        [makeEntry(2), makeEntry(10)],  // newest first, oldest last — wrong order
        11,
      ),
    }),
  },
  {
    label: 'Missed 4 days — needs restart',
    description: 'Last completed day was 5 days ago (4 days missed — one past the limit). Should show "It\'s been a little while."',
    color: '#C0604A',
    build: () => ({
      active: buildProcess(
        [makeEntry(6), makeEntry(5)],
        7,
      ),
    }),
  },
  {
    label: 'View Completion — 30/30, missed 1 calendar day',
    description: 'All 30 sessions done, but with a rest day in between. Earns 30-Day badge but NOT perfect attendance.',
    color: '#2A78C8',
    build: () => {
      // 30 entries over 31 calendar days (one rest day after day 4).
      const entries: ThirtyDayEntry[] = [];
      for (let i = 0; i < 4; i++) entries.push(makeEntry(32 - i));  // days 1-4 (32..29 ago)
      // 28 days ago skipped (rest day)
      for (let i = 0; i < 26; i++) entries.push(makeEntry(27 - i)); // days 5-30 (27..2 ago)
      // total: 4 + 26 = 30 entries ✓, span = 30 calendar days → not perfect
      const process: ThirtyDayProcess = {
        ...buildProcess(entries, 32),
        completedAt: new Date().toISOString(),
      };
      return { history: [process] };
    },
  },
  {
    label: 'View Completion — perfect 30/30',
    description: 'Seeds a perfectly completed process, then opens the Wrapped screen.',
    color: '#2A78C8',
    build: () => {
      const entries: ThirtyDayEntry[] = [];
      for (let i = PROCESS_LENGTH; i >= 1; i--) entries.push(makeEntry(i));
      const process: ThirtyDayProcess = {
        ...buildProcess(entries, PROCESS_LENGTH),
        completedAt: new Date().toISOString(),
      };
      return { history: [process] };
    },
  },
];

export default function ThirtyDayDebugScreen() {
  const navigation = useNavigation<Nav>();
  const [status, setStatus] = useState<string>('');

  const apply = async (idx: number) => {
    const scenario = SCENARIOS[idx];
    const { active, history } = scenario.build();

    // Clear existing state
    await AsyncStorage.removeItem(ACTIVE_KEY);

    const existingHistoryJson = await AsyncStorage.getItem(HISTORY_KEY);
    const existingHistory: ThirtyDayProcess[] = existingHistoryJson
      ? JSON.parse(existingHistoryJson)
      : [];

    if (active) {
      await saveActiveProcess(active);
    }

    if (history) {
      await AsyncStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([...history, ...existingHistory]),
      );
    }

    setStatus(`✓ "${scenario.label}" applied`);

    // Navigate directly to completion screen for "View Completion" scenarios
    if (history) {
      navigation.navigate('ThirtyDayCompletion');
    }
  };

  const resetTodayExercises = async () => {
    const today = getTodayDateKey();

    // Strip today's meditation events from activity log
    const actJson = await AsyncStorage.getItem(ACTIVITY_KEY);
    if (actJson) {
      const log = JSON.parse(actJson);
      const filtered = log.filter(
        (ev: { type: string; timestamp: string }) =>
          !(ev.type === 'meditation' && ev.timestamp.startsWith(today))
      );
      await AsyncStorage.setItem(ACTIVITY_KEY, JSON.stringify(filtered));
    }

    // Strip today's book entries
    const entriesJson = await AsyncStorage.getItem(ENTRIES_KEY);
    if (entriesJson) {
      const entries = JSON.parse(entriesJson);
      const filtered = entries.filter(
        (e: { createdAt: string }) => !e.createdAt.startsWith(today)
      );
      await AsyncStorage.setItem(ENTRIES_KEY, JSON.stringify(filtered));
    }

    // Strip today's archived focus wheels
    const wheelJson = await AsyncStorage.getItem(WHEEL_ARCHIVE_KEY);
    if (wheelJson) {
      const wheels = JSON.parse(wheelJson);
      const filtered = wheels.filter(
        (w: { archivedAt?: string }) => !w.archivedAt?.startsWith(today)
      );
      await AsyncStorage.setItem(WHEEL_ARCHIVE_KEY, JSON.stringify(filtered));
    }

    // Also clear today's entry from the active process so the flow restarts clean
    const activeJson = await AsyncStorage.getItem(ACTIVE_KEY);
    if (activeJson) {
      const proc: ThirtyDayProcess = JSON.parse(activeJson);
      const cleaned = { ...proc, days: proc.days.filter((d) => d.date !== today) };
      await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(cleaned));
    }

    setStatus(`✓ Today's exercise data cleared — re-enter the practice to start fresh`);
  };

  const resetAll = () => {
    Alert.alert('Reset all 30-day data?', 'Clears both active process and history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(ACTIVE_KEY);
          await AsyncStorage.removeItem(HISTORY_KEY);
          setStatus('✓ All 30-day data cleared');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>30-Day Debug</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.warning}>⚠️  Dev only — not shown in production builds</Text>

        {status ? <Text style={styles.statusMsg}>{status}</Text> : null}

        {SCENARIOS.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.btn, { borderLeftColor: s.color }]}
            onPress={() => apply(i)}
            activeOpacity={0.75}
          >
            <Text style={styles.btnLabel}>{s.label}</Text>
            <Text style={styles.btnDesc}>{s.description}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.utilBtn} onPress={resetTodayExercises}>
          <Text style={styles.utilText}>Clear today's exercise data</Text>
          <Text style={styles.utilDesc}>Removes today's meditation, book entry, and focus wheel so the practice flow sees a clean slate. Use this when the flow unexpectedly skips a step.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={resetAll}>
          <Text style={styles.resetText}>Reset all 30-day data</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          After applying an in-progress scenario, go to Home → 30-Day Practice to continue the flow normally.{'\n\n'}
          If the flow skips a step (e.g. jumps past Focus Wheel), tap "Clear today's exercise data" first.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F4FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D8F0',
  },
  backBtn: { padding: 4, width: 60 },
  backText: { fontSize: 18, color: '#4A7FA6', fontFamily: 'Nunito_700Bold' },
  title: { fontSize: 18, color: '#2E1A47', fontFamily: 'Nunito_700Bold' },
  scroll: { padding: 20, gap: 12, paddingBottom: 48 },
  warning: { fontSize: 13, color: '#A06030', fontFamily: 'Nunito_400Regular', textAlign: 'center', marginBottom: 4 },
  statusMsg: {
    fontSize: 14,
    color: '#2A7A4A',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    backgroundColor: '#E8F8EE',
    borderRadius: 8,
    padding: 10,
  },
  btn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#C0B0D8',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  btnLabel: { fontSize: 16, color: '#2E1A47', fontFamily: 'Nunito_700Bold' },
  btnDesc:  { fontSize: 14, color: '#5A6A7A', fontFamily: 'Nunito_400Regular', lineHeight: 20 },
  utilBtn: {
    borderWidth: 1,
    borderColor: '#5A8FAA',
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  utilText: { fontSize: 15, color: '#5A8FAA', fontFamily: 'Nunito_700Bold' },
  utilDesc: { fontSize: 13, color: '#5A7A9A', fontFamily: 'Nunito_400Regular', lineHeight: 18 },
  resetBtn: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#D05040',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  resetText: { fontSize: 15, color: '#D05040', fontFamily: 'Nunito_700Bold' },
  note: {
    fontSize: 13,
    color: '#8A90A0',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
});
