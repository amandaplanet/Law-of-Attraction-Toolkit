import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThirtyDayProcess, ThirtyDayEntry } from '../types';

const ACTIVE_KEY  = '@thirty_day_active';
const HISTORY_KEY = '@thirty_day_history';

// Change back to 30 when done testing
export const PROCESS_LENGTH = 3;

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function makeNewProcess(): ThirtyDayProcess {
  return { id: makeId(), startedAt: new Date().toISOString(), days: [] };
}

export async function getActiveProcess(): Promise<ThirtyDayProcess | null> {
  try {
    const json = await AsyncStorage.getItem(ACTIVE_KEY);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

export async function saveActiveProcess(process: ThirtyDayProcess): Promise<void> {
  try {
    await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(process));
  } catch {}
}

export async function finalizeProcess(
  process: ThirtyDayProcess,
  reason: 'completed' | 'abandoned',
): Promise<void> {
  try {
    const finalized: ThirtyDayProcess = {
      ...process,
      ...(reason === 'completed'
        ? { completedAt: new Date().toISOString() }
        : { abandonedAt: new Date().toISOString() }),
    };
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    const history: ThirtyDayProcess[] = json ? JSON.parse(json) : [];
    history.unshift(finalized);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    await AsyncStorage.removeItem(ACTIVE_KEY);
  } catch {}
}

export function getCompletedCount(process: ThirtyDayProcess): number {
  return process.days.filter((d) => d.completed).length;
}

export function getTodayEntry(process: ThirtyDayProcess): ThirtyDayEntry | null {
  return process.days.find((d) => d.date === getTodayDateKey()) ?? null;
}

/**
 * How many calendar days have passed since the last completed practice
 * (or since startedAt if no days completed yet) without a practice.
 * > 3 means the user needs to start over.
 */
export function getDaysMissed(process: ThirtyDayProcess): number {
  const completed = process.days.filter((d) => d.completed);
  const refStr = completed.length > 0
    ? completed[completed.length - 1].date
    : process.startedAt.slice(0, 10);

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const ref = new Date(refStr + 'T12:00:00');
  const diffDays = Math.round((today.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays - 1);
}

export async function getLastCompletedProcess(): Promise<ThirtyDayProcess | null> {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    const history: ThirtyDayProcess[] = json ? JSON.parse(json) : [];
    return history.find((p) => !!p.completedAt) ?? null;
  } catch { return null; }
}

export async function getCompletedProcesses(): Promise<ThirtyDayProcess[]> {
  try {
    const json = await AsyncStorage.getItem(HISTORY_KEY);
    const history: ThirtyDayProcess[] = json ? JSON.parse(json) : [];
    return history.filter((p) => !!p.completedAt);
  } catch { return []; }
}

export function hasPerfectAttendance(process: ThirtyDayProcess): boolean {
  const sorted = process.days
    .filter((d) => d.completed)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length < PROCESS_LENGTH) return false;
  const first = new Date(sorted[0].date + 'T12:00:00');
  const last  = new Date(sorted[PROCESS_LENGTH - 1].date + 'T12:00:00');
  const diff  = Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
  return diff === PROCESS_LENGTH - 1;
}

export type CompletionStats = {
  totalMeditations:  number;
  totalBookEntries:  number;
  totalFocusWheels:  number;
  avgBefore:         number | null;
  avgAfter:          number | null;
  bestDayLabel:      string | null;
  bestDayBefore:     number | null;
  bestDayAfter:      number | null;
  perfectAttendance: boolean;
};

export function computeCompletionStats(process: ThirtyDayProcess): CompletionStats {
  const completed = process.days.filter((d) => d.completed);
  const sorted    = [...completed].sort((a, b) => a.date.localeCompare(b.date));

  const totalMeditations = completed.filter((d) => d.meditationDone).length;
  const totalBookEntries = completed.filter((d) => d.bookDone).length;
  const totalFocusWheels = completed.filter((d) => d.focusWheelDone).length;

  const befores = completed.map((d) => d.emotionBefore).filter((n): n is number => n !== null);
  const afters  = completed.map((d) => d.emotionAfter).filter((n): n is number => n !== null);

  const avgBefore = befores.length > 0
    ? Math.round(befores.reduce((a, b) => a + b, 0) / befores.length)
    : null;
  const avgAfter  = afters.length > 0
    ? Math.round(afters.reduce((a, b) => a + b, 0) / afters.length)
    : null;

  let bestEntry: ThirtyDayEntry | null = null;
  let bestDelta = -Infinity;
  for (const day of completed) {
    if (day.emotionBefore !== null && day.emotionAfter !== null) {
      const delta = day.emotionBefore - day.emotionAfter;
      if (delta > bestDelta) { bestDelta = delta; bestEntry = day; }
    }
  }

  let bestDayLabel: string | null = null;
  if (bestEntry) {
    const idx = sorted.findIndex((d) => d.date === bestEntry!.date);
    bestDayLabel = `Day ${idx + 1}`;
  }

  return {
    totalMeditations,
    totalBookEntries,
    totalFocusWheels,
    avgBefore,
    avgAfter,
    bestDayLabel,
    bestDayBefore:     bestEntry?.emotionBefore ?? null,
    bestDayAfter:      bestEntry?.emotionAfter  ?? null,
    perfectAttendance: hasPerfectAttendance(process),
  };
}
