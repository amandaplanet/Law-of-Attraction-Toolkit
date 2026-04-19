import {
  getDaysMissed,
  hasPerfectAttendance,
  computeCompletionStats,
  PROCESS_LENGTH,
} from '../storage/thirtyDayStorage';
import { ThirtyDayProcess, ThirtyDayEntry } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDateKey(daysAgo: number): string {
  const d = new Date('2026-04-19T12:00:00Z');
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function makeEntry(daysAgo: number, overrides: Partial<ThirtyDayEntry> = {}): ThirtyDayEntry {
  return {
    date: makeDateKey(daysAgo),
    emotionBefore: 14,
    emotionAfter: 9,
    meditationDone: true,
    bookDone: true,
    focusWheelDone: true,
    completed: true,
    ...overrides,
  };
}

function makeProcess(
  entries: ThirtyDayEntry[],
  startDaysAgo: number,
  overrides: Partial<ThirtyDayProcess> = {},
): ThirtyDayProcess {
  const start = new Date('2026-04-19T12:00:00Z');
  start.setDate(start.getDate() - startDaysAgo);
  return {
    id: 'test-id',
    startedAt: start.toISOString(),
    days: entries,
    ...overrides,
  };
}

// Fix "today" so getDaysMissed calculations are deterministic
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-04-19T14:00:00Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

// ── hasPerfectAttendance ──────────────────────────────────────────────────────

describe('hasPerfectAttendance', () => {
  it('returns true for exactly 30 consecutive days', () => {
    const entries: ThirtyDayEntry[] = [];
    for (let i = PROCESS_LENGTH - 1; i >= 0; i--) entries.push(makeEntry(i));
    expect(hasPerfectAttendance(makeProcess(entries, PROCESS_LENGTH))).toBe(true);
  });

  it('returns false when fewer than 30 completed days exist', () => {
    const entries: ThirtyDayEntry[] = [];
    for (let i = PROCESS_LENGTH - 2; i >= 0; i--) entries.push(makeEntry(i)); // 29 entries
    expect(hasPerfectAttendance(makeProcess(entries, PROCESS_LENGTH))).toBe(false);
  });

  it('returns false when 30 entries span more than 29 calendar days (gap exists)', () => {
    const entries: ThirtyDayEntry[] = [];
    // Days 1-4, skip day 5, days 6-31 → 30 entries over 31 days
    for (let i = 31; i >= 28; i--) entries.push(makeEntry(i)); // days 1-4
    for (let i = 26; i >= 0; i--) entries.push(makeEntry(i));  // days 6-31
    expect(hasPerfectAttendance(makeProcess(entries, 31))).toBe(false);
  });

  it('returns false for an empty process', () => {
    expect(hasPerfectAttendance(makeProcess([], 0))).toBe(false);
  });

  it('ignores entries where completed is false', () => {
    const entries: ThirtyDayEntry[] = [];
    for (let i = PROCESS_LENGTH - 1; i >= 0; i--) {
      entries.push(makeEntry(i, { completed: i === 5 ? false : true }));
    }
    // 29 completed out of 30 → no perfect attendance
    expect(hasPerfectAttendance(makeProcess(entries, PROCESS_LENGTH))).toBe(false);
  });
});

// ── getDaysMissed ─────────────────────────────────────────────────────────────

describe('getDaysMissed', () => {
  it('returns 0 when no completed days and process started today', () => {
    const proc = makeProcess([], 0); // startedAt = today
    expect(getDaysMissed(proc)).toBe(0);
  });

  it('returns 1 when no completed days and process started 2 days ago', () => {
    const proc = makeProcess([], 2);
    expect(getDaysMissed(proc)).toBe(1);
  });

  it('returns 0 when last completed day was today', () => {
    const proc = makeProcess([makeEntry(0)], 1);
    expect(getDaysMissed(proc)).toBe(0);
  });

  it('returns 0 when last completed day was yesterday', () => {
    const proc = makeProcess([makeEntry(1)], 2);
    expect(getDaysMissed(proc)).toBe(0);
  });

  it('returns 3 when last completed day was 4 days ago', () => {
    const proc = makeProcess([makeEntry(4)], 5);
    expect(getDaysMissed(proc)).toBe(3);
  });

  it('returns 4 when last completed day was 5 days ago (restart threshold exceeded)', () => {
    const proc = makeProcess([makeEntry(5)], 6);
    expect(getDaysMissed(proc)).toBe(4);
  });

  it('uses the last completed day, not the last entry in the array', () => {
    // entries not in date order; completed only for daysAgo=3
    const entries = [
      makeEntry(3),
      makeEntry(1, { completed: false }),
    ];
    const proc = makeProcess(entries, 4);
    // Last completed is 3 days ago → 2 days missed
    expect(getDaysMissed(proc)).toBe(2);
  });
});

// ── computeCompletionStats ────────────────────────────────────────────────────

describe('computeCompletionStats', () => {
  it('counts meditations, book entries, and focus wheels correctly', () => {
    const entries = [
      makeEntry(2, { meditationDone: true,  bookDone: true,  focusWheelDone: true }),
      makeEntry(1, { meditationDone: false, bookDone: true,  focusWheelDone: true }),
      makeEntry(0, { meditationDone: true,  bookDone: false, focusWheelDone: false }),
    ];
    const stats = computeCompletionStats(makeProcess(entries, 3));
    expect(stats.totalMeditations).toBe(2);
    expect(stats.totalBookEntries).toBe(2);
    expect(stats.totalFocusWheels).toBe(2);
  });

  it('returns null averages when all emotion values are null', () => {
    const entries = [
      makeEntry(1, { emotionBefore: null as any, emotionAfter: null as any }),
      makeEntry(0, { emotionBefore: null as any, emotionAfter: null as any }),
    ];
    const stats = computeCompletionStats(makeProcess(entries, 2));
    expect(stats.avgBefore).toBeNull();
    expect(stats.avgAfter).toBeNull();
  });

  it('computes rounded averages for emotion levels', () => {
    const entries = [
      makeEntry(2, { emotionBefore: 10, emotionAfter: 7 }),
      makeEntry(1, { emotionBefore: 6,  emotionAfter: 3 }),
      makeEntry(0, { emotionBefore: 5,  emotionAfter: 2 }),
    ];
    const stats = computeCompletionStats(makeProcess(entries, 3));
    // avgBefore: (10+6+5)/3 = 7
    expect(stats.avgBefore).toBe(7);
    // avgAfter: (7+3+2)/3 = 4
    expect(stats.avgAfter).toBe(4);
  });

  it('identifies the best day as the one with the largest before-to-after improvement', () => {
    // Day 1 (oldest): 14→9 = delta 5
    // Day 2:          12→4 = delta 8  ← best
    // Day 3 (today):  10→7 = delta 3
    const entries = [
      makeEntry(2, { emotionBefore: 14, emotionAfter: 9 }),
      makeEntry(1, { emotionBefore: 12, emotionAfter: 4 }),
      makeEntry(0, { emotionBefore: 10, emotionAfter: 7 }),
    ];
    const stats = computeCompletionStats(makeProcess(entries, 3));
    expect(stats.bestDayLabel).toBe('Day 2');
    expect(stats.bestDayBefore).toBe(12);
    expect(stats.bestDayAfter).toBe(4);
  });

  it('returns null bestDayLabel when all emotion values are null', () => {
    const entries = [
      makeEntry(0, { emotionBefore: null as any, emotionAfter: null as any }),
    ];
    const stats = computeCompletionStats(makeProcess(entries, 1));
    expect(stats.bestDayLabel).toBeNull();
  });

  it('sets perfectAttendance true for 30 consecutive completed days', () => {
    const entries: ThirtyDayEntry[] = [];
    for (let i = PROCESS_LENGTH - 1; i >= 0; i--) entries.push(makeEntry(i));
    const stats = computeCompletionStats(makeProcess(entries, PROCESS_LENGTH));
    expect(stats.perfectAttendance).toBe(true);
  });

  it('sets perfectAttendance false when a day was skipped', () => {
    const entries: ThirtyDayEntry[] = [];
    for (let i = PROCESS_LENGTH - 1; i >= 1; i--) entries.push(makeEntry(i)); // skip today
    const stats = computeCompletionStats(makeProcess(entries, PROCESS_LENGTH));
    expect(stats.perfectAttendance).toBe(false);
  });

  it('returns 0 counts for an empty process', () => {
    const stats = computeCompletionStats(makeProcess([], 0));
    expect(stats.totalMeditations).toBe(0);
    expect(stats.totalBookEntries).toBe(0);
    expect(stats.totalFocusWheels).toBe(0);
    expect(stats.avgBefore).toBeNull();
    expect(stats.avgAfter).toBeNull();
    expect(stats.bestDayLabel).toBeNull();
    expect(stats.perfectAttendance).toBe(false);
  });

  it('only counts completed days (ignores completed: false entries)', () => {
    const entries = [
      makeEntry(1, { completed: false, meditationDone: true, bookDone: true, focusWheelDone: true }),
      makeEntry(0, { completed: true,  meditationDone: true, bookDone: true, focusWheelDone: true }),
    ];
    const stats = computeCompletionStats(makeProcess(entries, 2));
    expect(stats.totalMeditations).toBe(1);
  });
});
