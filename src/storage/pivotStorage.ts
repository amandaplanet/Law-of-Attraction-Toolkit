import AsyncStorage from '@react-native-async-storage/async-storage';
import { PivotEntry } from '../types';

const DRAFT_KEY   = '@pivot_draft';
const ARCHIVE_KEY = '@pivot_archive';

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

type PivotDraft = { dontWant: string; doWants: string[] };

export async function getPivotDraft(): Promise<PivotDraft | null> {
  try {
    const json = await AsyncStorage.getItem(DRAFT_KEY);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

export async function savePivotDraft(draft: PivotDraft): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function getArchivedPivots(): Promise<PivotEntry[]> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    return json ? JSON.parse(json) : [];
  } catch { return []; }
}

export async function archivePivot(draft: PivotDraft): Promise<void> {
  const entry: PivotEntry = {
    id: makeId(),
    dontWant: draft.dontWant,
    doWants: draft.doWants,
    createdAt: new Date().toISOString(),
  };
  const json = await AsyncStorage.getItem(ARCHIVE_KEY);
  const archive: PivotEntry[] = json ? JSON.parse(json) : [];
  archive.unshift(entry);
  await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
  await AsyncStorage.removeItem(DRAFT_KEY);
}
