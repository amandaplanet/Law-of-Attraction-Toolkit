import AsyncStorage from '@react-native-async-storage/async-storage';
import { FocusWheel } from '../types';

const DRAFT_KEY = '@focus_wheel_draft';
const ARCHIVE_KEY = '@focus_wheel_archive';

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function makeEmptyWheel(): FocusWheel {
  return {
    id: makeId(),
    centerStatement: '',
    spokes: Array.from({ length: 12 }, (_, i) => ({ index: i, text: '' })),
    createdAt: new Date().toISOString(),
    archivedAt: null,
  };
}

export async function getDraft(): Promise<FocusWheel | null> {
  try {
    const json = await AsyncStorage.getItem(DRAFT_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(wheel: FocusWheel): Promise<void> {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(wheel));
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_KEY);
}

export async function getArchivedWheels(): Promise<FocusWheel[]> {
  try {
    const json = await AsyncStorage.getItem(ARCHIVE_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function archiveWheel(wheel: FocusWheel): Promise<void> {
  const stamped: FocusWheel = { ...wheel, archivedAt: new Date().toISOString() };
  const archived = await getArchivedWheels();
  archived.unshift(stamped);
  await AsyncStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived));
  await clearDraft();
}
