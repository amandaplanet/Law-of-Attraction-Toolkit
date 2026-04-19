import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getArchivedItems,
  archiveSingleItem,
  archivePlacemat,
} from '../storage/placematStorage';
import { Placemat, PlacematItem, ArchivedPlacematItem } from '../types';

const ARCHIVE_V1_KEY = '@placemat_archive';
const ARCHIVE_V2_KEY = '@placemat_archive_v2';
const DRAFT_KEY      = '@placemat_draft';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeItem(overrides: Partial<PlacematItem> = {}): PlacematItem {
  return {
    id: 'item-1',
    text: 'test task',
    list: 'mine',
    done: false,
    ...overrides,
  };
}

function makePlacemat(items: PlacematItem[], createdAt = '2026-01-10T10:00:00.000Z'): Placemat {
  return { id: 'pm-1', items, createdAt };
}

// ── getArchivedItems — v1 → v2 migration ─────────────────────────────────────

describe('getArchivedItems — v1→v2 migration', () => {
  it('returns [] when storage is empty', async () => {
    const result = await getArchivedItems();
    expect(result).toEqual([]);
  });

  it('returns existing v2 data without migrating', async () => {
    const v2Items: ArchivedPlacematItem[] = [
      { id: 'x', text: 'done', list: 'universe', done: true, archivedAt: '2026-03-01T00:00:00.000Z' },
    ];
    await AsyncStorage.setItem(ARCHIVE_V2_KEY, JSON.stringify(v2Items));
    const result = await getArchivedItems();
    expect(result).toEqual(v2Items);
  });

  it('migrates v1 placemat objects to flat item list', async () => {
    const v1Data: Placemat[] = [
      makePlacemat([
        makeItem({ id: 'a', text: 'task A', list: 'mine' }),
        makeItem({ id: 'b', text: 'task B', list: 'universe' }),
      ], '2026-01-10T10:00:00.000Z'),
    ];
    await AsyncStorage.setItem(ARCHIVE_V1_KEY, JSON.stringify(v1Data));

    const result = await getArchivedItems();

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'a', text: 'task A', list: 'mine', archivedAt: '2026-01-10T10:00:00.000Z' });
    expect(result[1]).toMatchObject({ id: 'b', text: 'task B', list: 'universe', archivedAt: '2026-01-10T10:00:00.000Z' });
  });

  it('preserves the placemat createdAt as archivedAt for every migrated item', async () => {
    const ts = '2026-02-15T08:30:00.000Z';
    const v1Data: Placemat[] = [
      makePlacemat([makeItem({ id: 'c' })], ts),
    ];
    await AsyncStorage.setItem(ARCHIVE_V1_KEY, JSON.stringify(v1Data));

    const result = await getArchivedItems();
    expect(result[0].archivedAt).toBe(ts);
  });

  it('clears the v1 key after migration', async () => {
    const v1Data: Placemat[] = [makePlacemat([makeItem()])];
    await AsyncStorage.setItem(ARCHIVE_V1_KEY, JSON.stringify(v1Data));

    await getArchivedItems();

    const v1After = await AsyncStorage.getItem(ARCHIVE_V1_KEY);
    expect(v1After).toBeNull();
  });

  it('writes migrated data to the v2 key', async () => {
    const v1Data: Placemat[] = [makePlacemat([makeItem({ id: 'd', text: 'migrated' })])];
    await AsyncStorage.setItem(ARCHIVE_V1_KEY, JSON.stringify(v1Data));

    await getArchivedItems();

    const v2After = await AsyncStorage.getItem(ARCHIVE_V2_KEY);
    expect(v2After).not.toBeNull();
    const parsed: ArchivedPlacematItem[] = JSON.parse(v2After!);
    expect(parsed[0]).toMatchObject({ id: 'd', text: 'migrated' });
  });

  it('handles multiple v1 placemats, flattening all items', async () => {
    const v1Data: Placemat[] = [
      makePlacemat([makeItem({ id: 'e' })], '2026-01-01T00:00:00.000Z'),
      makePlacemat([makeItem({ id: 'f' }), makeItem({ id: 'g' })], '2026-01-02T00:00:00.000Z'),
    ];
    await AsyncStorage.setItem(ARCHIVE_V1_KEY, JSON.stringify(v1Data));

    const result = await getArchivedItems();
    expect(result).toHaveLength(3);
  });
});

// ── archiveSingleItem ─────────────────────────────────────────────────────────

describe('archiveSingleItem', () => {
  it('saves an item with an archivedAt timestamp', async () => {
    const item = makeItem({ id: 'single-1', text: 'my task' });
    await archiveSingleItem(item);

    const result = await getArchivedItems();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('single-1');
    expect(result[0].text).toBe('my task');
    expect(result[0].archivedAt).toBeTruthy();
  });

  it('prepends new items so the most recent is first', async () => {
    await archiveSingleItem(makeItem({ id: 'first' }));
    await archiveSingleItem(makeItem({ id: 'second' }));

    const result = await getArchivedItems();
    expect(result[0].id).toBe('second');
    expect(result[1].id).toBe('first');
  });

  it('accumulates multiple items in the archive', async () => {
    await archiveSingleItem(makeItem({ id: '1' }));
    await archiveSingleItem(makeItem({ id: '2' }));
    await archiveSingleItem(makeItem({ id: '3' }));

    const result = await getArchivedItems();
    expect(result).toHaveLength(3);
  });

  it('preserves all PlacematItem fields', async () => {
    const item = makeItem({ id: 'full', text: 'full item', list: 'universe', done: true });
    await archiveSingleItem(item);

    const result = await getArchivedItems();
    expect(result[0]).toMatchObject({ id: 'full', text: 'full item', list: 'universe', done: true });
  });
});

// ── archivePlacemat ───────────────────────────────────────────────────────────

describe('archivePlacemat', () => {
  it('archives all items from the placemat individually', async () => {
    const placemat = makePlacemat([
      makeItem({ id: 'p1', text: 'task 1' }),
      makeItem({ id: 'p2', text: 'task 2' }),
      makeItem({ id: 'p3', text: 'task 3' }),
    ]);
    await archivePlacemat(placemat);

    const result = await getArchivedItems();
    expect(result).toHaveLength(3);
    const ids = result.map((r) => r.id);
    expect(ids).toContain('p1');
    expect(ids).toContain('p2');
    expect(ids).toContain('p3');
  });

  it('stamps the same archivedAt on all items from the same placemat', async () => {
    const placemat = makePlacemat([
      makeItem({ id: 'q1' }),
      makeItem({ id: 'q2' }),
    ]);
    await archivePlacemat(placemat);

    const result = await getArchivedItems();
    expect(result[0].archivedAt).toBe(result[1].archivedAt);
  });

  it('removes the draft key after archiving', async () => {
    const placemat = makePlacemat([makeItem()]);
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(placemat));

    await archivePlacemat(placemat);

    const draft = await AsyncStorage.getItem(DRAFT_KEY);
    expect(draft).toBeNull();
  });

  it('appends to existing archive rather than replacing it', async () => {
    await archiveSingleItem(makeItem({ id: 'existing' }));

    const placemat = makePlacemat([makeItem({ id: 'new-1' }), makeItem({ id: 'new-2' })]);
    await archivePlacemat(placemat);

    const result = await getArchivedItems();
    expect(result).toHaveLength(3);
  });

  it('handles an empty placemat gracefully', async () => {
    await archivePlacemat(makePlacemat([]));
    const result = await getArchivedItems();
    expect(result).toHaveLength(0);
  });
});
