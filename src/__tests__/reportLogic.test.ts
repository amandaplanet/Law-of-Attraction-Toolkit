import {
  toDateKey,
  toMonthKey,
  buildPeriodKeys,
  computeStats,
  emptyCompletions,
  type PeriodData,
  type Scale,
} from '../utils/reportLogic';

// ── toDateKey ─────────────────────────────────────────────────────────────────

describe('toDateKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 3, 9))).toBe('2026-04-09'); // April = month 3
  });

  it('zero-pads single-digit months and days', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05'); // January 5
  });
});

// ── toMonthKey ────────────────────────────────────────────────────────────────

describe('toMonthKey', () => {
  it('formats a date as YYYY-MM', () => {
    expect(toMonthKey(new Date(2026, 3, 9))).toBe('2026-04');
  });

  it('zero-pads single-digit months', () => {
    expect(toMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
  });
});

// ── buildPeriodKeys ───────────────────────────────────────────────────────────

describe('buildPeriodKeys', () => {
  it('returns 7 keys for 7d scale', () => {
    expect(buildPeriodKeys('7d')).toHaveLength(7);
  });

  it('returns 30 keys for 1m scale', () => {
    expect(buildPeriodKeys('1m')).toHaveLength(30);
  });

  it('returns 12 keys for 1y scale', () => {
    expect(buildPeriodKeys('1y')).toHaveLength(12);
  });

  it('last key in 7d is today', () => {
    const keys = buildPeriodKeys('7d');
    expect(keys[6]).toBe(toDateKey(new Date()));
  });

  it('last key in 1m is today', () => {
    const keys = buildPeriodKeys('1m');
    expect(keys[29]).toBe(toDateKey(new Date()));
  });

  it('7d keys are in ascending order', () => {
    const keys = buildPeriodKeys('7d');
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });

  it('1y keys are in ascending month order', () => {
    const keys = buildPeriodKeys('1y');
    for (let i = 1; i < keys.length; i++) {
      expect(keys[i] > keys[i - 1]).toBe(true);
    }
  });

  it('1y keys have YYYY-MM format', () => {
    const keys = buildPeriodKeys('1y');
    keys.forEach((k) => expect(k).toMatch(/^\d{4}-\d{2}$/));
  });

  it('7d keys have YYYY-MM-DD format', () => {
    const keys = buildPeriodKeys('7d');
    keys.forEach((k) => expect(k).toMatch(/^\d{4}-\d{2}-\d{2}$/));
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePeriod(
  key: string,
  emotionLevel: number | null,
  allEmotions: number[] = [],
  overrides: Partial<ReturnType<typeof emptyCompletions>> = {}
): PeriodData {
  return {
    key,
    emotionLevel,
    allEmotions: allEmotions.length > 0 ? allEmotions : (emotionLevel !== null ? [emotionLevel] : []),
    completions: { ...emptyCompletions(), ...overrides },
  };
}

// ── computeStats ──────────────────────────────────────────────────────────────

describe('computeStats', () => {
  describe('avgLevel', () => {
    it('is null when no emotion data', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', null),
        makePeriod('2026-04-02', null),
      ];
      expect(computeStats(data, '7d').avgLevel).toBeNull();
    });

    it('averages emotion levels across periods', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', 4),
        makePeriod('2026-04-02', 8),
        makePeriod('2026-04-03', null),
      ];
      expect(computeStats(data, '7d').avgLevel).toBeCloseTo(6);
    });

    it('excludes periods with no emotion from average', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', 2),
        makePeriod('2026-04-02', null),
        makePeriod('2026-04-03', null),
      ];
      expect(computeStats(data, '7d').avgLevel).toBe(2);
    });
  });

  describe('bestLevel', () => {
    it('is null when no emotion data', () => {
      const data: PeriodData[] = [makePeriod('2026-04-01', null)];
      expect(computeStats(data, '7d').bestLevel).toBeNull();
    });

    it('returns the lowest numeric level (closest to Joy = 1)', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', 14),
        makePeriod('2026-04-02', 3),
        makePeriod('2026-04-03', 8),
      ];
      expect(computeStats(data, '7d').bestLevel).toBe(3);
    });
  });

  describe('totalSessions', () => {
    it('is 0 with no completions', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', null),
        makePeriod('2026-04-02', null),
      ];
      expect(computeStats(data, '7d').totalSessions).toBe(0);
    });

    it('sums all process completions across all periods', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', null, [], { meditation: 1, book: 2 }),
        makePeriod('2026-04-02', null, [], { sixty_eight: 1, focus_wheel: 1 }),
      ];
      expect(computeStats(data, '7d').totalSessions).toBe(5);
    });

    it('counts emotion check-ins separately from process completions', () => {
      // Emotion logging does NOT count as a session
      const data: PeriodData[] = [
        makePeriod('2026-04-01', 5, [5], { meditation: 1 }),
      ];
      expect(computeStats(data, '7d').totalSessions).toBe(1);
    });
  });

  describe('streak', () => {
    it('is 0 when no activity', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', null),
        makePeriod('2026-04-02', null),
      ];
      expect(computeStats(data, '7d').streak).toBe(0);
    });

    it('counts consecutive active periods from the most recent', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', null),        // inactive
        makePeriod('2026-04-02', 5),           // active
        makePeriod('2026-04-03', null, [], { meditation: 1 }), // active
        makePeriod('2026-04-04', 8),           // active
      ];
      // Reversed: Apr 4 (active), Apr 3 (active), Apr 2 (active), Apr 1 (inactive — breaks streak)
      expect(computeStats(data, '7d').streak).toBe(3);
    });

    it('breaks on the first inactive period from the end', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', 3),
        makePeriod('2026-04-02', null),  // gap — breaks streak
        makePeriod('2026-04-03', 6),
        makePeriod('2026-04-04', 9),
      ];
      expect(computeStats(data, '7d').streak).toBe(2);
    });

    it('is equal to data length when every period has activity', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', 10),
        makePeriod('2026-04-02', 8),
        makePeriod('2026-04-03', 6),
        makePeriod('2026-04-04', 4),
      ];
      expect(computeStats(data, '7d').streak).toBe(4);
    });

    it('counts emotion check-in alone as activity', () => {
      const data: PeriodData[] = [
        makePeriod('2026-04-01', null),
        makePeriod('2026-04-02', 7),  // emotion only
      ];
      expect(computeStats(data, '7d').streak).toBe(1);
    });
  });

  describe('labels', () => {
    it('returns correct periodLabel for each scale', () => {
      const empty: PeriodData[] = [];
      expect(computeStats(empty, '7d').periodLabel).toBe('this week');
      expect(computeStats(empty, '1m').periodLabel).toBe('this month');
      expect(computeStats(empty, '1y').periodLabel).toBe('this year');
    });

    it('returns "day" streakUnit for daily scales', () => {
      expect(computeStats([], '7d').streakUnit).toBe('day');
      expect(computeStats([], '1m').streakUnit).toBe('day');
    });

    it('returns "month" streakUnit for yearly scale', () => {
      expect(computeStats([], '1y').streakUnit).toBe('month');
    });
  });
});
