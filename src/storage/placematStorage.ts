import AsyncStorage from '@react-native-async-storage/async-storage';
import { Placemat } from '../types';

const DRAFT_KEY   = '@placemat_draft';
const ARCHIVE_KEY = '@placemat_archive';

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

export async function getArchivedPlacemats(): Promise<Placemat[]> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

export async function archivePlacemat(placemat: Placemat): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    const archive: Placemat[] = json ? JSON.parse(json) : [];
    archive.unshift(placemat);
    await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  } catch {}
  await AsyncStorage.removeItem(DRAFT_KEY);
}
