import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePostHog } from 'posthog-react-native';

type Nav = StackNavigationProp<RootStackParamList>;
type ToolScreen = 'Book' | 'FocusWheel' | 'Meditation' | 'SixtyEightSecond' | 'CreativeWorkshop' | 'Placemat' | 'Pivot';

type Tool = { screen: ToolScreen; label: string; emoji: string };
type Recommendation = { title: string; message: string; tools: Tool[] };

const EMOTIONS = [
  { level: 1,  label: 'Joy / Knowledge / Empowerment / Freedom / Love / Appreciation', color: '#FFD700' },
  { level: 2,  label: 'Passion',                                                         color: '#FFC107' },
  { level: 3,  label: 'Enthusiasm / Eagerness / Happiness',                              color: '#FFAB40' },
  { level: 4,  label: 'Positive Expectation / Belief',                                   color: '#A5D6A7' },
  { level: 5,  label: 'Optimism',                                                         color: '#66BB6A' },
  { level: 6,  label: 'Hopefulness',                                                      color: '#4DB6AC' },
  { level: 7,  label: 'Contentment',                                                      color: '#4FC3F7' },
  { level: 8,  label: 'Boredom',                                                          color: '#90A4AE' },
  { level: 9,  label: 'Pessimism',                                                        color: '#78909C' },
  { level: 10, label: 'Frustration / Irritation / Impatience',                            color: '#FFCC80' },
  { level: 11, label: '"Overwhelment"',                                                    color: '#FFA726' },
  { level: 12, label: 'Disappointment',                                                    color: '#FF8A65' },
  { level: 13, label: 'Doubt',                                                             color: '#FF7043' },
  { level: 14, label: 'Worry',                                                             color: '#EF5350' },
  { level: 15, label: 'Blame',                                                             color: '#E53935' },
  { level: 16, label: 'Discouragement',                                                    color: '#C62828' },
  { level: 17, label: 'Anger',                                                             color: '#AD1457' },
  { level: 18, label: 'Revenge',                                                           color: '#880E4F' },
  { level: 19, label: 'Hatred / Rage',                                                     color: '#6A1B9A' },
  { level: 20, label: 'Jealousy',                                                          color: '#4527A0' },
  { level: 21, label: 'Insecurity / Guilt / Unworthiness',                                 color: '#283593' },
  { level: 22, label: 'Fear / Grief / Depression / Despair / Powerlessness',               color: '#1A237E' },
] as const;

function getRecommendation(level: number): Recommendation {
  // Creative Workshop:        levels 1–5
  // Book of Positive Aspects: levels 1–10
  // 68-Second Focus:          levels 1–11
  // Focus Wheel:              levels 8–17
  // Placemat Process:         levels 2–11
  // Meditation:               all levels

  if (level === 1) {
    return {
      title: "You're soaring! ✨",
      message:
        'Your vibration is at its highest. Use the Creative Workshop to clarify what you want, hold a thought for 68 seconds to send it into motion, or write in the Book of Positive Aspects.',
      tools: [
        { screen: 'Meditation',       label: 'Meditation',               emoji: '🧘' },
        { screen: 'SixtyEightSecond', label: '68-Second Focus',          emoji: '⏱️' },
        { screen: 'Book',             label: 'Book of Positive Aspects', emoji: '📖' },
        { screen: 'CreativeWorkshop', label: 'Creative Workshop',        emoji: '🎨' },
      ],
    };
  }
  if (level <= 5) {
    return {
      title: "You're soaring! ✨",
      message:
        'Your vibration is high. Use the Creative Workshop to clarify what you want, hold a thought for 68 seconds to send it into motion, or write in the Book of Positive Aspects. The Placemat can help you stay light by handing off what doesn\'t need your energy.',
      tools: [
        { screen: 'Meditation',       label: 'Meditation',               emoji: '🧘' },
        { screen: 'SixtyEightSecond', label: '68-Second Focus',          emoji: '⏱️' },
        { screen: 'Book',             label: 'Book of Positive Aspects', emoji: '📖' },
        { screen: 'CreativeWorkshop', label: 'Creative Workshop',        emoji: '🎨' },
        { screen: 'Placemat',         label: 'Placemat Process',         emoji: '🍽️' },
      ],
    };
  }
  if (level <= 7) {
    return {
      title: 'High vibration 🌟',
      message:
        'Your vibration is strong. Hold a thought for 68 seconds to build momentum, or write in the Book of Positive Aspects to amplify what feels good. The Placemat can help you keep your plate light.',
      tools: [
        { screen: 'Meditation',       label: 'Meditation',               emoji: '🧘' },
        { screen: 'SixtyEightSecond', label: '68-Second Focus',          emoji: '⏱️' },
        { screen: 'Book',             label: 'Book of Positive Aspects', emoji: '📖' },
        { screen: 'Placemat',         label: 'Placemat Process',         emoji: '🍽️' },
      ],
    };
  }
  if (level <= 10) {
    return {
      title: 'Great energy to work with 🌈',
      message:
        'You have access to the full toolkit. Try Pivoting to redirect any resistant thoughts toward what you want instead. The Placemat can hand off what feels heavy, and the Focus Wheel builds momentum.',
      tools: [
        { screen: 'Meditation',       label: 'Meditation',               emoji: '🧘' },
        { screen: 'Pivot',            label: 'Pivoting',                 emoji: '🔄' },
        { screen: 'Placemat',         label: 'Placemat Process',         emoji: '🍽️' },
        { screen: 'SixtyEightSecond', label: '68-Second Focus',          emoji: '⏱️' },
        { screen: 'Book',             label: 'Book of Positive Aspects', emoji: '📖' },
        { screen: 'FocusWheel',       label: 'Focus Wheel',              emoji: '🎯' },
      ],
    };
  }
  if (level === 11) {
    return {
      title: 'Feeling overwhelmed? Hand it off. 🌿',
      message:
        'The Placemat Process helps you put down what isn\'t yours. Pivoting can redirect any specific thought you\'re stuck on. Meditation quiets the noise so the shift feels possible.',
      tools: [
        { screen: 'Meditation',       label: 'Meditation',       emoji: '🧘' },
        { screen: 'Pivot',            label: 'Pivoting',         emoji: '🔄' },
        { screen: 'Placemat',         label: 'Placemat Process', emoji: '🍽️' },
        { screen: 'FocusWheel',       label: 'Focus Wheel',      emoji: '🎯' },
      ],
    };
  }
  if (level <= 17) {
    return {
      title: 'Reach for relief 🌬️',
      message:
        'Pivoting is powerful here — notice the unwanted thought and ask "what do I want instead?" The Focus Wheel can then build momentum toward it. Meditation helps quiet resistance so the shift feels easier.',
      tools: [
        { screen: 'Meditation', label: 'Meditation',  emoji: '🧘' },
        { screen: 'Pivot',      label: 'Pivoting',    emoji: '🔄' },
        { screen: 'FocusWheel', label: 'Focus Wheel', emoji: '🎯' },
      ],
    };
  }
  return {
    title: 'Be gentle with yourself 💙',
    message:
      "Meditation is your most powerful tool right now. It creates a gap in the resistance and lets Source energy in. You don't have to reach for joy — just reach for a little peace.",
    tools: [
      { screen: 'Meditation', label: 'Meditation', emoji: '🧘' },
    ],
  };
}

const PANEL_OFFSET = 390;

export default function EmotionalGuidanceScaleScreen() {
  const navigation = useNavigation<Nav>();
  const posthog = usePostHog();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const panelAnim = useRef(new Animated.Value(PANEL_OFFSET)).current;
  const isPanelVisible = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const rowOffsets = useRef<number[]>([]);

  const panResponder = useRef(
    PanResponder.create({
      // Claim the touch immediately so swipes aren't lost to parent scrollers
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gs) => {
        const isTap  = Math.abs(gs.dx) < 10 && Math.abs(gs.dy) < 10;
        const isSwipeDown = gs.dy > 40;
        if (isTap || isSwipeDown) hidePanel();
      },
    })
  ).current;

  const showPanel = () => {
    isPanelVisible.current = true;
    setIsPanelOpen(true);
    Animated.spring(panelAnim, {
      toValue: 0,
      tension: 60,
      friction: 10,
      useNativeDriver: true,
    }).start();
  };

  const hidePanel = (onDone?: () => void) => {
    isPanelVisible.current = false;
    Animated.timing(panelAnim, {
      toValue: PANEL_OFFSET,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setSelectedLevel(null);
      setIsPanelOpen(false);
      onDone?.();
    });
  };

  const scrollToRow = (level: number) => {
    const rowY = rowOffsets.current[level - 1] ?? 0;
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, rowY - 60), animated: true });
    }, 50);
  };

  const handleSelect = (level: number) => {
    if (!isPanelVisible.current) {
      setSelectedLevel(level);
      showPanel();
      scrollToRow(level);
    } else if (selectedLevel === level) {
      hidePanel();
    } else {
      setSelectedLevel(level);
      scrollToRow(level);
    }
  };

  const recommendation = selectedLevel ? getRecommendation(selectedLevel) : null;
  const selectedColor = selectedLevel ? EMOTIONS[selectedLevel - 1].color : '#7B4FA6';

  const navigateTo = (screen: ToolScreen) => {
    posthog.capture('tool_opened', {
      tool: screen,
      source: 'emotional_scale',
      emotion_level: selectedLevel,
      emotion_label: selectedLevel ? EMOTIONS[selectedLevel - 1].label : undefined,
    });
    if (screen === 'Book') navigation.navigate('Book');
    else if (screen === 'FocusWheel') navigation.navigate('FocusWheel');
    else if (screen === 'SixtyEightSecond') navigation.navigate('SixtyEightSecond');
    else if (screen === 'CreativeWorkshop') navigation.navigate('CreativeWorkshop');
    else if (screen === 'Placemat') navigation.navigate('Placemat');
    else if (screen === 'Pivot') navigation.navigate('Pivot');
    else navigation.navigate('Meditation');
  };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emotional Scale</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={styles.subtitle}>Where are you right now?</Text>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.listContent,
            selectedLevel !== null && { paddingBottom: PANEL_OFFSET + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {EMOTIONS.map((emotion) => {
            const isSelected = selectedLevel === emotion.level;
            return (
              <React.Fragment key={emotion.level}>
              {emotion.level === 8 && (
                <View style={styles.tippingPoint}>
                  <View style={styles.tippingLine} />
                  <Text style={styles.tippingText}>↑ tipping point</Text>
                  <View style={styles.tippingLine} />
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.row,
                  isSelected && {
                    backgroundColor: emotion.color + '1A',
                    borderColor: emotion.color,
                  },
                ]}
                onPress={() => handleSelect(emotion.level)}
                onLayout={(e) => { rowOffsets.current[emotion.level - 1] = e.nativeEvent.layout.y; }}
                activeOpacity={1}
              >
                <View style={[styles.levelBadge, { backgroundColor: emotion.color }]}>
                  <Text style={styles.levelNum}>{emotion.level}</Text>
                </View>
                <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                  {emotion.label}
                </Text>
                {isSelected && (
                  <Text style={[styles.check, { color: emotion.color }]}>✓</Text>
                )}
              </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </ScrollView>

        {/* Sliding recommendation panel */}
        <Animated.View
          style={[styles.panel, { transform: [{ translateY: panelAnim }] }]}
          pointerEvents={isPanelOpen ? 'auto' : 'none'}
        >
          {/* Swipe zone: stripe + handle + title + message all dismiss on swipe/tap */}
          <View {...panResponder.panHandlers}>
            <View style={[styles.panelStripe, { backgroundColor: selectedColor }]} />
            <View style={styles.handleZone}>
              <View style={styles.handle} />
            </View>
            {recommendation && (
              <>
                <Text style={styles.panelTitle}>{recommendation.title}</Text>
                <Text style={styles.panelMessage}>{recommendation.message}</Text>
              </>
            )}
          </View>

          {recommendation && (
            <View style={styles.toolRow}>
              {recommendation.tools.map((tool) => (
                <TouchableOpacity
                  key={tool.screen}
                  style={[styles.toolBtn, { flexBasis: recommendation.tools.length >= 5 ? '30%' : '47%' }]}
                  onPress={() => navigateTo(tool.screen)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                  <Text style={styles.toolLabel}>{tool.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0F0720' },
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
  backText: { fontSize: 20, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#E8D5F5', fontFamily: 'Pacifico_400Regular' },
  subtitle: {
    fontSize: 18,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(176, 138, 212, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  levelNum: {
    fontSize: 15,
    color: '#000',
    fontFamily: 'Nunito_700Bold',
  },
  rowLabel: {
    flex: 1,
    fontSize: 17,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  rowLabelSelected: {
    color: '#F0E6FF',
    fontFamily: 'Nunito_700Bold',
  },
  check: {
    fontSize: 20,
    fontFamily: 'Nunito_700Bold',
  },
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1A0A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -8 },
    elevation: 20,
    overflow: 'hidden',
  },
  panelStripe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  panelTitle: {
    fontSize: 22,
    color: '#F0E6FF',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 8,
  },
  panelMessage: {
    fontSize: 17,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    marginBottom: 18,
  },
  toolRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toolBtn: {
    flexGrow: 1,
    backgroundColor: 'rgba(123, 79, 166, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(176, 138, 212, 0.3)',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(176, 138, 212, 0.35)',
  },
  tippingPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
  },
  tippingLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(176, 138, 212, 0.25)',
  },
  tippingText: {
    fontSize: 12,
    color: 'rgba(176, 138, 212, 0.6)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  toolEmoji: { fontSize: 24 },
  toolLabel: {
    fontSize: 14,
    color: '#E8D5F5',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
});
