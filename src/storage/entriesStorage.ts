import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry, BulletItem } from '../types';

const STORAGE_KEY = '@positive_aspects_entries';
const DRAFT_KEY   = '@book_entry_draft';

export async function getDraftEntry(): Promise<{ topic: string; bullets: BulletItem[] } | null> {
  try {
    const json = await AsyncStorage.getItem(DRAFT_KEY);
    return json ? JSON.parse(json) : null;
  } catch { return null; }
}

export async function saveDraftEntry(topic: string, bullets: BulletItem[]): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify({ topic, bullets }));
}

export async function clearDraftEntry(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function getEntries(): Promise<Entry[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveEntry(entry: Entry): Promise<void> {
  const entries = await getEntries();
  entries.push(entry);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function updateEntry(updated: Entry): Promise<void> {
  const entries = await getEntries();
  const idx = entries.findIndex((e) => e.id === updated.id);
  if (idx !== -1) {
    entries[idx] = updated;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

export async function deleteEntry(id: string): Promise<void> {
  const entries = await getEntries();
  const filtered = entries.filter((e) => e.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
