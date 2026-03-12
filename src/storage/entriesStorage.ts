import AsyncStorage from '@react-native-async-storage/async-storage';
import { Entry } from '../types';

const STORAGE_KEY = '@positive_aspects_entries';

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
