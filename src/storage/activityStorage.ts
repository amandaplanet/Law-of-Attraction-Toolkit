import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityEvent } from '../types';

const KEY = '@activity_log';

export async function logActivity(event: ActivityEvent): Promise<void> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    const log: ActivityEvent[] = json ? JSON.parse(json) : [];
    log.push(event);
    await AsyncStorage.setItem(KEY, JSON.stringify(log));
  } catch {}
}

export async function getActivityLog(): Promise<ActivityEvent[]> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}
