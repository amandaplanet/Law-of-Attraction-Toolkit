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
import Svg, { Circle } from 'react-native-svg';
import { usePostHog } from 'posthog-react-native';

// ─── Arc geometry ────────────────────────────────────────────────────────────
const SVG_SIZE  = 280;
const RADIUS    = 108;
const STROKE    = 13;
const CX        = SVG_SIZE / 2;
const CY        = SVG_SIZE / 2;
const CIRC      = 2 * Math.PI * RADIUS;
const GAP_FRAC  = 0.022;
const GAP       = CIRC * GAP_FRAC;
const SEG       = (CIRC - 4 * GAP) / 4;

// Offset positions each arc so they sit evenly around the circle,
// starting from 12 o'clock (clockwise).
function segOffset(index: number) {
  return CIRC / 4 - index * (SEG + GAP);
}

// How much of segment `index` should be filled given total elapsed seconds.
function segFill(index: number, elapsed: number) {
  const phaseStart   = index * 17;
  const phaseElapsed = Math.min(Math.max(elapsed - phaseStart, 0), 17);
  return (phaseElapsed / 17) * SEG;
}

// ─── Phase data ──────────────────────────────────────────────────────────────
const PHASES = [
  { label: 'Activation',    sub: 'A thought is being held',          color: '#9B72CC' },
  { label: 'Momentum',      sub: 'Momentum is building',              color: '#C07BC0' },
  { label: 'Amplification', sub: 'The thought is expanding',          color: '#E8A87C' },
  { label: 'Manifestation', sub: "It's entering your reality",        color: '#FFD700' },
];

type TimerState = 'idle' | 'running' | 'done';

// ─── Component ───────────────────────────────────────────────────────────────
export default function SixtyEightSecondScreen() {
  const navigation   = useNavigation();
  const posthog = usePostHog();
  const [state, setState]   = useState<TimerState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const prevPhaseRef = useRef(-1);
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  const currentPhase = Math.min(Math.floor(elapsed / 17), 3);
  const phase        = PHASES[currentPhase];

  // ── Countdown tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (state !== 'running') return;
    const id = setInterval(() => {
      setElapsed((s) => {
        if (s >= 68) return s;
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state]);

  // ── Detect completion ─────────────────────────────────────────────────────
  useEffect(() => {
    if (state === 'running' && elapsed >= 68) {
      setState('done');
      posthog.capture('sixty_eight_second_completed');
    }
  }, [elapsed, state]);

  // ── Pulse on phase transition ─────────────────────────────────────────────
  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 250, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 250, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  useEffect(() => {
    if (state !== 'running') return;
    if (currentPhase !== prevPhaseRef.current) {
      prevPhaseRef.current = currentPhase;
      if (currentPhase > 0) pulse();
    }
  }, [currentPhase, state, pulse]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const handleBegin = () => {
    setElapsed(0);
    prevPhaseRef.current = 0;
    setState('running');
  };

  const handleStop = () => {
    setState('idle');
    setElapsed(0);
    prevPhaseRef.current = -1;
    pulseAnim.setValue(1);
  };

  // ── Derived display values ────────────────────────────────────────────────
  const arcColor     = state === 'done' ? '#FFD700' : phase.color;
  const centerColor  = state === 'done' ? '#FFD700' : '#F0E6FF';

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>68-Second Focus</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.subtitle}>
          Think of something you want and focus purely on the positive feeling of having it. Hold that thought for 68 seconds and feel the momentum build.
        </Text>

        {/* Circle */}
        <View style={styles.circleWrap}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            {PHASES.map((p, i) => {
              const fill       = segFill(i, elapsed);
              const trackColor = 'rgba(176,138,212,0.12)';
              return (
                <React.Fragment key={i}>
                  {/* Background track arc */}
                  <Circle
                    cx={CX} cy={CY} r={RADIUS}
                    stroke={trackColor}
                    strokeWidth={STROKE}
                    strokeDasharray={`${SEG} ${CIRC - SEG}`}
                    strokeDashoffset={segOffset(i)}
                    fill="none"
                    strokeLinecap="round"
                  />
                  {/* Fill arc */}
                  {fill > 0 && (
                    <Circle
                      cx={CX} cy={CY} r={RADIUS}
                      stroke={state === 'done' ? '#FFD700' : p.color}
                      strokeWidth={STROKE}
                      strokeDasharray={`${fill} ${CIRC - fill}`}
                      strokeDashoffset={segOffset(i)}
                      fill="none"
                      strokeLinecap="round"
                    />
                  )}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Center content */}
          <Animated.View style={[styles.centerContent, { transform: [{ scale: pulseAnim }] }]}>
            {state === 'done' ? (
              <>
                <Text style={styles.doneEmoji}>🌟</Text>
                <Text style={[styles.doneLabel, { color: '#FFD700' }]}>68 seconds</Text>
                <Text style={styles.doneSub}>Your thought is{'\n'}now in motion</Text>
              </>
            ) : (
              <>
                <Text style={[styles.elapsedNum, { color: centerColor }]}>
                  {state === 'idle' ? '0' : String(elapsed)}
                </Text>
                <Text style={styles.elapsedUnit}>seconds</Text>
                {state === 'running' && (
                  <Text style={[styles.phaseName, { color: arcColor }]}>{phase.label}</Text>
                )}
              </>
            )}
          </Animated.View>
        </View>

        {/* Phase milestones */}
        <View style={styles.milestones}>
          {PHASES.map((p, i) => {
            const reached = elapsed >= i * 17;
            const active  = currentPhase === i && state === 'running';
            return (
              <View key={i} style={styles.milestone}>
                <View style={[
                  styles.milestoneDot,
                  reached && state !== 'idle' && { backgroundColor: p.color, borderColor: p.color },
                  active && styles.milestoneDotActive,
                ]} />
                <Text
                  style={[
                    styles.milestoneLabel,
                    reached && state !== 'idle' && { color: p.color },
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {p.label}
                </Text>
                <Text style={styles.milestoneSec}>{i * 17 + 17}s</Text>
              </View>
            );
          })}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {state === 'idle' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleBegin} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Begin</Text>
            </TouchableOpacity>
          )}
          {state === 'running' && (
            <TouchableOpacity style={styles.ghostBtn} onPress={handleStop} activeOpacity={0.85}>
              <Text style={styles.ghostBtnText}>Stop</Text>
            </TouchableOpacity>
          )}
          {state === 'done' && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStop} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

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
  backBtn:  { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#E8D5F5', fontFamily: 'Pacifico_400Regular' },
  subtitle: {
    fontSize: 17,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  circleWrap: {
    alignSelf: 'center',
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  elapsedNum: {
    fontSize: 64,
    fontFamily: 'Nunito_700Bold',
    lineHeight: 68,
  },
  elapsedUnit: {
    fontSize: 17,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    letterSpacing: 1,
  },
  phaseName: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  doneEmoji: { fontSize: 40, marginBottom: 4 },
  doneLabel: {
    fontSize: 22,
    fontFamily: 'Nunito_700Bold',
  },
  doneSub: {
    fontSize: 17,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 23,
  },
  milestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  milestone: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(176,138,212,0.3)',
    backgroundColor: 'transparent',
  },
  milestoneDotActive: {
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  milestoneLabel: {
    fontSize: 13,
    color: '#B08AD4',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  milestoneSec: {
    fontSize: 12,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
  },
  controls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 24,
  },
  primaryBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 56,
    shadowColor: '#9B72CC',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  primaryBtnText: { fontSize: 20, color: '#fff', fontFamily: 'Nunito_700Bold' },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.4)',
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 56,
  },
  ghostBtnText: { fontSize: 20, color: '#C4A8D4', fontFamily: 'Nunito_700Bold' },
});
