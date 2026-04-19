import { NativeModules, Platform } from 'react-native';

const { MediaPlaybackModule } = NativeModules;

/**
 * Starts an Android Foreground Service that keeps the process alive
 * while the screen is off, allowing the meditation timer and audio to run.
 * No-op on iOS (AVAudioSession handles this instead).
 */
export function startMediaSession(title: string): void {
  if (Platform.OS === 'android') {
    MediaPlaybackModule?.startService(title);
  }
}

/**
 * Stops the Foreground Service and dismisses the persistent notification.
 * Call when the session ends, is cancelled, or the screen is left.
 */
export function stopMediaSession(): void {
  if (Platform.OS === 'android') {
    MediaPlaybackModule?.stopService();
  }
}
