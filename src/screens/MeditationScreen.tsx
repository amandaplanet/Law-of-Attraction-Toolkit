import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { AudioContext, AudioBuffer } from 'react-native-audio-api';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activateAudioSession, setNowPlaying, clearNowPlaying } from '../modules/NowPlaying';
import { saveMindfulSession } from '../modules/HealthKit';
import { logActivity } from '../storage/activityStorage';
import InfoButton from '../components/InfoButton';
import { usePostHog } from 'posthog-react-native';

const PREFS_MINS_KEY  = '@meditation_mins';
const PREFS_SOUND_KEY = '@meditation_sound';

const ALARM_SOURCE = require('../../assets/sounds/abraham-alarm.wav');

const SOUNDS = [
  { key: 'silent', label: 'Silent',     module: null, attribution: null },
  { key: 'white',  label: 'White Noise', module: require('../../assets/sounds/white-noise.wav'), attribution: null },
  { key: 'stream', label: 'Stream',     module: require('../../assets/sounds/stream-noise.wav'), attribution: null },
  { key: 'fire',   label: 'Fire',       module: require('../../assets/sounds/fire-noise.wav'),
    attribution: 'fire_medium_loop.wav by PhreaKsAccount (freesound.org/s/46272) — CC Attribution 3.0' },
] as const;

type SoundKey = typeof SOUNDS[number]['key'];

const DURATIONS = [10, 15, 20];
type TimerState = 'idle' | 'running' | 'paused' | 'done';

function fmt(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function MeditationScreen() {
  const navigation = useNavigation();
  const posthog = usePostHog();
  const [selectedMins,  setSelectedMins]  = useState(15);
  const [selectedSound, setSelectedSound] = useState<SoundKey>('white');
  const [timerState,    setTimerState]    = useState<TimerState>('idle');
  const [secondsLeft,   setSecondsLeft]   = useState(15 * 60);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef  = useRef<AudioBuffer | null>(null);
  const sourceNodeRef   = useRef<any>(null);
  const isRunningRef    = useRef(false);
  const pulseAnim       = useRef(new Animated.Value(1)).current;
  const pulseLoopRef    = useRef<Animated.CompositeAnimation | null>(null);
  const sessionStartRef = useRef<number>(0);

  // Load saved preferences
  useEffect(() => {
    AsyncStorage.multiGet([PREFS_MINS_KEY, PREFS_SOUND_KEY]).then(([[, mins], [, sound]]) => {
      if (mins) {
        const m = parseInt(mins, 10);
        setSelectedMins(m);
        setSecondsLeft(m * 60);
      }
      if (sound) setSelectedSound(sound as SoundKey);
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRunningRef.current = false;
      stopAudio();
    };
  }, []);

  // Countdown tick
  useEffect(() => {
    if (timerState !== 'running') return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  // Detect timer reaching zero
  useEffect(() => {
    if (timerState === 'running' && secondsLeft === 0) {
      finishSession();
    }
  }, [secondsLeft, timerState]);

  // Breathing pulse animation
  const startPulse = useCallback(() => {
    isRunningRef.current = true;
    const loop = () => {
      if (!isRunningRef.current) return;
      pulseLoopRef.current = Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 4000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 4000, useNativeDriver: true }),
      ]);
      pulseLoopRef.current.start(({ finished }) => {
        if (finished && isRunningRef.current) loop();
      });
    };
    loop();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    isRunningRef.current = false;
    pulseLoopRef.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [pulseAnim]);

  // Audio — Web Audio API style, true gapless loop via AudioBufferSourceNode
  const startAudio = async (soundKey: SoundKey) => {
    const soundDef = SOUNDS.find((s) => s.key === soundKey)!;
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;

      if (!soundDef.module) {
        // Silent mode: loop a zero-filled buffer to keep the audio session
        // alive so iOS continues running JS (and the countdown) with screen off.
        const silentBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const source = ctx.createBufferSource();
        source.buffer = silentBuffer;
        source.loop = true;
        source.connect(ctx.destination);
        source.start();
        sourceNodeRef.current = source;
        return;
      }

      const asset = Asset.fromModule(soundDef.module);
      await asset.downloadAsync();

      const response = await fetch(asset.localUri!);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.loop = true;
      source.connect(ctx.destination);
      source.start();
      sourceNodeRef.current = source;
    } catch {
      // Audio not available — timer works without it
    }
  };

  const playAlarm = async () => {
    try {
      // Stop the looping source but keep the AudioContext open so iOS
      // honours the existing audio session when the screen is off.
      try { sourceNodeRef.current?.stop(); } catch {}
      sourceNodeRef.current = null;

      const asset = Asset.fromModule(ALARM_SOURCE);
      await asset.downloadAsync();
      const ctx = audioContextRef.current ?? new AudioContext();
      const response = await fetch(asset.localUri!);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    } catch {}
  };

  const pauseAudio = () => {
    audioContextRef.current?.suspend();
  };

  const resumeAudio = () => {
    audioContextRef.current?.resume();
  };

  const stopAudio = () => {
    try {
      sourceNodeRef.current?.stop();
    } catch {}
    try {
      audioContextRef.current?.close();
    } catch {}
    sourceNodeRef.current  = null;
    audioContextRef.current = null;
    audioBufferRef.current  = null;
  };

  // Controls
  const handleStart = async () => {
    const secs = selectedMins * 60;
    setSecondsLeft(secs);
    setTimerState('running');
    sessionStartRef.current = Date.now();
    activateAudioSession();
    await startAudio(selectedSound);
    startPulse();
    setNowPlaying({ title: `Meditation · ${selectedMins} min`, elapsed: 0, duration: secs, rate: 1.0 });
  };

  const handlePause = () => {
    setTimerState('paused');
    stopPulse();
    pauseAudio();
    const elapsed = selectedMins * 60 - secondsLeft;
    setNowPlaying({ title: `Meditation · ${selectedMins} min`, elapsed, duration: selectedMins * 60, rate: 0.0 });
  };

  const handleResume = () => {
    setTimerState('running');
    resumeAudio();
    startPulse();
    const elapsed = selectedMins * 60 - secondsLeft;
    setNowPlaying({ title: `Meditation · ${selectedMins} min`, elapsed, duration: selectedMins * 60, rate: 1.0 });
  };

  const handleStop = () => {
    setTimerState('idle');
    setSecondsLeft(selectedMins * 60);
    stopPulse();
    stopAudio();
    clearNowPlaying();
  };

  const finishSession = () => {
    setTimerState('done');
    stopPulse();
    playAlarm(); // stopAudio is handled inside playAlarm to keep the session alive
    clearNowPlaying();
    saveMindfulSession(sessionStartRef.current, Date.now());
    logActivity({ type: 'meditation', timestamp: new Date().toISOString(), durationMins: selectedMins });
    posthog.capture('meditation_completed', {
      duration_minutes: selectedMins,
      sound: selectedSound,
    });
  };

  const handleSelectDuration = (mins: number) => {
    setSelectedMins(mins);
    setSecondsLeft(mins * 60);
    AsyncStorage.setItem(PREFS_MINS_KEY, String(mins));
    if (timerState === 'running' || timerState === 'paused') {
      setTimerState('running');
      if (timerState === 'paused') {
        resumeAudio();
        startPulse();
      }
    }
  };

  const handleSelectSound = async (soundKey: SoundKey) => {
    setSelectedSound(soundKey);
    AsyncStorage.setItem(PREFS_SOUND_KEY, soundKey);
    if (timerState === 'running' || timerState === 'paused') {
      stopAudio();
      await startAudio(soundKey);
      if (timerState === 'paused') pauseAudio();
    }
  };

  const currentSound = SOUNDS.find((s) => s.key === selectedSound)!;

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0 }}>
            <Text style={[styles.headerTitle, { textAlign: 'center' }]}>Meditation</Text>
          </View>
          <InfoButton source="Inspired by Process #6 of Ask and It Is Given" />
        </View>

        {/* Duration pills */}
        <View style={styles.durationRow}>
          {DURATIONS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.pill, selectedMins === mins && styles.pillActive]}
              onPress={() => handleSelectDuration(mins)}
            >
              <Text style={[styles.pillText, selectedMins === mins && styles.pillTextActive]}>
                {mins} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sound selector */}
        <View style={styles.soundRow}>
          {SOUNDS.map((s) => (
            <TouchableOpacity
              key={s.key}
              style={[styles.soundPill, selectedSound === s.key && styles.soundPillActive]}
              onPress={() => handleSelectSound(s.key)}
            >
              <Text style={[styles.soundPillText, selectedSound === s.key && styles.soundPillTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Central display */}
        <View style={styles.center}>
          <Animated.View
            style={[styles.glowCircle, { transform: [{ scale: pulseAnim }] }]}
          />

          {timerState === 'done' ? (
            <View style={styles.doneBox}>
              <Text style={styles.doneEmoji}>🌟</Text>
              <Text style={styles.doneTitle}>Beautiful</Text>
              <Text style={styles.doneSub}>Session complete</Text>
            </View>
          ) : (
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{fmt(secondsLeft)}</Text>
              {timerState === 'paused' && (
                <Text style={styles.pausedLabel}>paused</Text>
              )}
              {timerState === 'running' && (
                <Text style={styles.noiseLabel}>🎵 {currentSound.label.toLowerCase()}</Text>
              )}
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {timerState === 'idle' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStart}>
              <Text style={styles.primaryBtnText}>Begin</Text>
            </TouchableOpacity>
          )}

          {timerState === 'running' && (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleStop}>
                <Text style={styles.ghostBtnText}>Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handlePause}>
                <Text style={styles.primaryBtnText}>⏸  Pause</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'paused' && (
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.ghostBtn} onPress={handleStop}>
                <Text style={styles.ghostBtnText}>Stop</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleResume}>
                <Text style={styles.primaryBtnText}>▶  Resume</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'done' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStop}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Credits */}
        <View style={styles.credits}>
          <Text style={styles.creditLine}>
            Completion sound by Abraham-Hicks, © Jerry & Esther Hicks{'\n'}AbrahamHicks.com · (830) 755-2299
          </Text>
          {currentSound.attribution && (
            <Text style={styles.creditLine}>{currentSound.attribution}</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const GLOW_SIZE = 260;

const styles = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: '#0F0720' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn:     { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#E8D5F5', fontFamily: 'Pacifico_400Regular' },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: 'rgba(176, 138, 212, 0.35)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 22,
  },
  pillActive:   { backgroundColor: 'rgba(123, 79, 166, 0.6)', borderColor: '#B08AD4' },
  pillDisabled: { opacity: 0.4 },
  pillText:       { fontSize: 17, color: '#C4A8D4', fontFamily: 'Nunito_700Bold' },
  pillTextActive: { color: '#F3E8FF' },
  soundRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 4,
    paddingBottom: 8,
  },
  soundPill: {
    borderWidth: 1,
    borderColor: 'rgba(176, 138, 212, 0.25)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  soundPillActive:     { backgroundColor: 'rgba(123, 79, 166, 0.45)', borderColor: '#B08AD4' },
  soundPillText:       { fontSize: 16, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  soundPillTextActive: { color: '#F3E8FF' },
  credits: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 3,
    alignItems: 'center',
  },
  creditLine: {
    textAlign: 'center',
    fontSize: 12,
    color: '#4A3060',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowCircle: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: 'rgba(123, 79, 166, 0.18)',
    shadowColor: '#9B72CC',
    shadowOpacity: 0.6,
    shadowRadius: 48,
    shadowOffset: { width: 0, height: 0 },
  },
  timerBox:    { alignItems: 'center' },
  timerText:   { fontSize: 72, color: '#F0E6FF', fontFamily: 'Nunito_700Bold', letterSpacing: 2 },
  pausedLabel: {
    fontSize: 17,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  doneBox:   { alignItems: 'center' },
  doneEmoji: { fontSize: 56, marginBottom: 12 },
  doneTitle: { fontSize: 36, color: '#F0E6FF', fontFamily: 'Pacifico_400Regular' },
  doneSub:   { fontSize: 18, color: '#C4A8D4', fontFamily: 'Nunito_400Regular', marginTop: 6 },
  noiseLabel: {
    fontSize: 15,
    color: '#B08AD4',
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 0.5,
    marginTop: 10,
  },
  controls:  { paddingBottom: 48, alignItems: 'center' },
  btnRow:    { flexDirection: 'row', gap: 16, alignItems: 'center' },
  primaryBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    shadowColor: '#9B72CC',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { fontSize: 20, color: '#fff', fontFamily: 'Nunito_700Bold' },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(176, 138, 212, 0.4)',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 28,
  },
  ghostBtnText: { fontSize: 20, color: '#C4A8D4', fontFamily: 'Nunito_700Bold' },
});
