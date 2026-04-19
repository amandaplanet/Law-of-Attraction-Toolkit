import AsyncStorage from '@react-native-async-storage/async-storage';
import { Placemat, PlacematItem, ArchivedPlacematItem } from '../types';

const DRAFT_KEY       = '@placemat_draft';
const ARCHIVE_KEY     = '@placemat_archive_v2';
const ARCHIVE_KEY_V1  = '@placemat_archive';

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeEmptyPlacemat(): Placemat {
  return { id: makeId(), items: [], createdAt: new Date().toISOString() };
}

export async function getDraft(): Promise<Placemat | null> {
  try {
    const json = await AsyncStorage.getItem(DRAFT_KEY);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

export async function saveDraft(placemat: Placemat): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(placemat));
}

export async function getArchivedItems(): Promise<ArchivedPlacematItem[]> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    if (json) return JSON.parse(json);

    // One-time migration from v1 (whole Placemat objects) to v2 (individual items)
    const v1json = await AsyncStorage.getItem(ARCHIVE_KEY_V1);
    if (v1json) {
      const v1: Placemat[] = JSON.parse(v1json);
      const migrated: ArchivedPlacematItem[] = v1.flatMap((p) =>
        p.items.map((item) => ({ ...item, archivedAt: p.createdAt }))
      );
      await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(migrated));
      await AsyncStorage.removeItem(ARCHIVE_KEY_V1);
      return migrated;
    }

    return [];
  } catch { return []; }
}

export async function archiveSingleItem(item: PlacematItem): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    const archive: ArchivedPlacematItem[] = json ? JSON.parse(json) : [];
    archive.unshift({ ...item, archivedAt: new Date().toISOString() });
    await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
}

export async function archivePlacemat(placemat: Placemat): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    const archive: ArchivedPlacematItem[] = json ? JSON.parse(json) : [];
    const now = new Date().toISOString();
    const newItems: ArchivedPlacematItem[] = placemat.items.map((item) => ({
      ...item,
      archivedAt: now,
    }));
    archive.unshift(...newItems);
    await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
  await AsyncStorage.removeItem(DRAFT_KEY);
}
