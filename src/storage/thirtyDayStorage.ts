import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThirtyDayProcess, ThirtyDayEntry } from '../types';

const ACTIVE_KEY  = '@thirty_day_active';
const HISTORY_KEY = '@thirty_day_history';

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
