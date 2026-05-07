import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { NowPlayingModule } = NativeModules;

interface NowPlayingInfo {
  title: string;
  elapsed: number;   // seconds already elapsed
  duration: number;  // total session length in seconds
  rate: number;      // 1.0 = playing, 0.0 = paused
}

/**
 * Updates the iOS Now Playing widget (Lock Screen / Control Centre).
 * iOS auto-advances the elapsed time display when rate = 1.0, so you only
 * need to call this once on start, once on pause, and once on resume.
 * No-ops on Android.
 */
export function activateAudioSession(): void {
  if (Platform.OS === 'ios') {
    NowPlayingModule?.activateAudioSession();
  }
}

export function setNowPlaying(info: NowPlayingInfo): void {
  if (Platform.OS === 'ios') {
    NowPlayingModule?.setNowPlaying(info);
  }
}

/** Removes the Now Playing entry from the Lock Screen / Control Centre. */
export function clearNowPlaying(): void {
  if (Platform.OS === 'ios') {
    NowPlayingModule?.clearNowPlaying();
  }
}

type RemoteCommand = 'play' | 'pause' | 'togglePlayPause';

/**
 * Subscribes to lock-screen / Control Centre remote commands.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 * No-ops on Android.
 */
export function onRemoteCommand(handler: (command: RemoteCommand) => void): () => void {
  if (Platform.OS !== 'ios' || !NowPlayingModule) return () => {};
  const emitter = new NativeEventEmitter(NowPlayingModule);
  const sub = emitter.addListener('onRemoteCommand', (event: { command: RemoteCommand }) => {
    handler(event.command);
  });
  return () => sub.remove();
}
