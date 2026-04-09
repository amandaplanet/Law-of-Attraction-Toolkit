import { NativeModules, Platform } from 'react-native';

const { HealthKitModule } = NativeModules;

/**
 * Saves a completed mindful session to Apple Health.
 * iOS only — no-ops silently on Android.
 *
 * @param startTimestamp - session start time as milliseconds since epoch (Date.now())
 * @param endTimestamp   - session end time as milliseconds since epoch (Date.now())
 */
export async function saveMindfulSession(
  startTimestamp: number,
  endTimestamp: number,
): Promise<void> {
  if (Platform.OS !== 'ios') return;
  await HealthKitModule?.saveMindfulSession(startTimestamp, endTimestamp);
}
