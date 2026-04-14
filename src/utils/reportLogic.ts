import { getActivityLog } from '../storage/activityStorage';
import { getEntries } from '../storage/entriesStorage';
import { getArchivedWheels } from '../storage/focusWheelStorage';
import { getArchivedPlacemats } from '../storage/placematStorage';
import { getArchivedPivots } from '../storage/pivotStorage';
import { getWorkshop } from '../storage/workshopStorage';

// ── Types ─────────────────────────────────────────────────────────────────────

export type Scale = '7d' | '1m' | '1y';
export type ProcessKey =
  | 'meditation'
  | 'sixty_eight'
  | 'book'
  | 'focus_wheel'
  | 'placemat'
  | 'pivot'
  | 'workshop';

export type PeriodData = {
  key: string; // YYYY-MM-DD (daily) or YYYY-MM (monthly)
  emotionLevel: number | null;
  allEmotions: number[]; // all logged emotions in chronological order
  completions: Record<ProcessKey, number>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

export const EMOTION_COLORS = [
  '#FFD700', '#FFC107', '#FFAB40', '#A5D6A7', '#66BB6A',
  '#4DB6AC', '#4FC3F7', '#90A4AE', '#78909C', '#FFCC80',
  '#FFA726', '#FF8A65', '#FF7043', '#EF5350', '#E53935',
  '#C62828', '#AD1457', '#880E4F', '#6A1B9A', '#4527A0',
  '#283593', '#1A237E',
];

export const EMOTION_LABELS = [
  'Joy',
  'Passion',
  'Enthusiasm',
  'Positive Expectation',
  'Optimism',
  'Hopefulness',
  'Contentment',
  'Boredom',
  'Pessimism',
  'Frustration',
  'Overwhelment',
  'Disappointment',
  'Doubt',
  'Worry',
  'Blame',
  'Discouragement',
  'Anger',
  'Revenge',
  'Hatred',
  'Jealousy',
  'Insecurity',
  'Fear',
];

export const PROCESS_EMOJIS: Record<ProcessKey, string> = {
  meditation:  '🧘',
  sixty_eight: '⏱️',
  book:        '📖',
  focus_wheel: '🎯',
  placemat:    '🍽️',
  pivot:       '🔄',
  workshop:    '🎨',
};

export const PROCESS_LABELS: Record<ProcessKey, string> = {
  meditation:  'Meditation',
  sixty_eight: '68-Second',
  book:        'Book',
  focus_wheel: 'Focus Wheel',
  placemat:    'Placemat',
  pivot:       'Pivot',
  workshop:    'Workshop',
};

export const PROCESS_KEYS: ProcessKey[] = [
  'meditation', 'sixty_eight', 'book', 'focus_wheel', 'placemat', 'pivot', 'workshop',
];

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const DAY_SHORT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ── Date helpers ──────────────────────────────────────────────────────────────

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function isoToDateKey(iso: string): string  { return toDateKey(new Date(iso)); }
export function isoToMonthKey(iso: string): string { return toMonthKey(new Date(iso)); }

export function buildPeriodKeys(scale: Scale): string[] {
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

export function formatPeriodLabel(key: string, scale: Scale): string {
  if (scale === '1y') {
    const mon = parseInt(key.slice(5, 7), 10) - 1;
    return `${MONTH_NAMES[mon]} ${key.slice(0, 4)}`;
  }
  const d = new Date(key + 'T12:00:00'); // noon avoids DST edge cases
  return `${DAY_SHORT[d.getDay()]} ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

// ── Data loading ──────────────────────────────────────────────────────────────

export function emptyCompletions(): Record<ProcessKey, number> {
  return { meditation: 0, sixty_eight: 0, book: 0, focus_wheel: 0, placemat: 0, pivot: 0, workshop: 0 };
}

export async function loadReportData(scale: Scale): Promise<PeriodData[]> {
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

  const dataMap: Record<string, PeriodData & { _emotions: number[] }> = {};
  for (const key of periods) {
    dataMap[key] = { key, emotionLevel: null, allEmotions: [], completions: emptyCompletions(), _emotions: [] };
  }

  const placematDays = new Set<string>();

  for (const event of activityLog) {
    const key = keyFn(event.timestamp);
    if (!dataMap[key]) continue;
    if (event.type === 'meditation')  dataMap[key].completions.meditation++;
    if (event.type === 'sixty_eight') dataMap[key].completions.sixty_eight++;
    if (event.type === 'emotion')     dataMap[key]._emotions.push(event.level);
    if (event.type === 'placemat')    placematDays.add(key);
  }

  for (const key of periods) {
    const levels = dataMap[key]._emotions;
    if (levels.length === 0) continue;
    dataMap[key].allEmotions = levels;
    dataMap[key].emotionLevel = scale === '1y'
      ? levels.reduce((a, b) => a + b, 0) / levels.length
      : levels[levels.length - 1];
  }

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
    placematDays.add(keyFn(placemat.createdAt));
  }
  for (const day of placematDays) {
    if (dataMap[day]) dataMap[day].completions.placemat++;
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
    const { _emotions: _e, ...rest } = dataMap[key];
    return rest;
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export function computeStats(data: PeriodData[], scale: Scale) {
  const withEmotion = data.filter((d) => d.emotionLevel !== null);
  const avgLevel = withEmotion.length > 0
    ? withEmotion.reduce((s, d) => s + d.emotionLevel!, 0) / withEmotion.length
    : null;

  let bestLevel: number | null = null;
  for (const d of withEmotion) {
    if (bestLevel === null || d.emotionLevel! < bestLevel) bestLevel = d.emotionLevel!;
  }

  const totalSessions = data.reduce((sum, d) =>
    sum + PROCESS_KEYS.reduce((s2, k) => s2 + d.completions[k], 0), 0);

  // Streak: consecutive periods (most recent first) with any activity
  let streak = 0;
  const reversed = [...data].reverse();
  for (const d of reversed) {
    const hasActivity =
      d.emotionLevel !== null || PROCESS_KEYS.some((k) => d.completions[k] > 0);
    if (!hasActivity) break;
    streak++;
  }

  const periodLabel = scale === '7d' ? 'this week' : scale === '1m' ? 'this month' : 'this year';
  const streakUnit  = scale === '1y' ? 'month' : 'day';

  return { avgLevel, bestLevel, totalSessions, streak, periodLabel, streakUnit };
}
