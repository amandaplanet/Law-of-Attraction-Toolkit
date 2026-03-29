import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import WheelView, { SECTOR_COLORS } from '../components/WheelView';
import { FocusWheel } from '../types';
import {
  getDraft, saveDraft, archiveWheel, makeEmptyWheel,
} from '../storage/focusWheelStorage';

type Nav = StackNavigationProp<RootStackParamList, 'FocusWheel'>;

export default function FocusWheelScreen() {
  const navigation = useNavigation<Nav>();
  const [wheel, setWheel] = useState<FocusWheel>(makeEmptyWheel());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const centerInputRef = useRef<TextInput>(null);
  const inputRefs = useRef<Array<TextInput | null>>(new Array(12).fill(null));
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageYOffset = useRef(0);
  const spokeYOffsets = useRef<number[]>(new Array(12).fill(0));

  // Load draft on focus
  useFocusEffect(useCallback(() => {
    getDraft().then((draft) => {
      if (draft) setWheel(draft);
    });
  }, []));

  // Debounced auto-save
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(wheel), 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [wheel]);

  const updateCenter = useCallback((text: string) => {
    setWheel((w) => ({ ...w, centerStatement: text }));
  }, []);

  const updateSpoke = useCallback((i: number, text: string) => {
    setWheel((w) => ({
      ...w,
      spokes: w.spokes.map((s) => (s.index === i ? { ...s, text } : s)),
    }));
  }, []);

  const handleSpokeChange = useCallback((i: number, raw: string) => {
    if (raw.includes('\n')) {
      updateSpoke(i, raw.replace(/\n/g, ''));
      const next = i + 1;
      if (next < 12) {
        inputRefs.current[next]?.focus();
        setActiveIndex(next);
        scrollToSpoke(next);
      } else {
        inputRefs.current[i]?.blur();
        setActiveIndex(null);
      }
    } else {
      updateSpoke(i, raw);
    }
  }, [updateSpoke, scrollToSpoke]);

  const scrollToSpoke = useCallback((i: number) => {
    const y = pageYOffset.current + spokeYOffsets.current[i];
    scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  const handleSpokePress = useCallback((i: number) => {
    inputRefs.current[i]?.focus();
    setActiveIndex(i);
    scrollToSpoke(i);
  }, [scrollToSpoke]);

  const handleArchive = async () => {
    if (!wheel.centerStatement.trim()) {
      Alert.alert('Add a center statement', 'Fill in your center statement before archiving.');
      return;
    }
    const filled = wheel.spokes.filter((s) => s.text.trim()).length;
    if (filled === 0) {
      Alert.alert('Nothing to archive', 'Add at least one spoke statement.');
      return;
    }
    await archiveWheel(wheel);
    setWheel(makeEmptyWheel());
    setActiveIndex(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const filledCount = wheel.spokes.filter((s) => s.text.trim()).length;

  const spinAnim = useRef(new Animated.Value(0)).current;

  const handleSpin = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 2400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const spinRotation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '1080deg'],
  });

  return (
    <LinearGradient colors={['#EEE0FA', '#FFF3CD']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Focus Wheel</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('FocusWheelArchive')}
              style={styles.historyBtn}
            >
              <Text style={styles.historyText}>Archive ›</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs + Wheel inside one ScrollView */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}
          >
            {/* Wheel — scrolls with content */}
            <View style={styles.wheelWrapper}>
              <Animated.View style={{ transform: [{ rotate: spinRotation }] }}>
                <WheelView
                  spokes={wheel.spokes}
                  centerStatement={wheel.centerStatement}
                  activeIndex={activeIndex}
                  onSpokePress={handleSpokePress}
                  size={268}
                />
              </Animated.View>
              <Text style={styles.progress}>
                {filledCount}/12 spokes filled
              </Text>
              {filledCount === 12 && (
                <TouchableOpacity
                  style={styles.spinBtn}
                  onPress={handleSpin}
                  activeOpacity={0.8}
                >
                  <Text style={styles.spinBtnText}>Spin 🌀</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* Center statement */}
            <View style={styles.page} onLayout={(e) => { pageYOffset.current = e.nativeEvent.layout.y; }}>
              <Text style={styles.sectionLabel}>Center Statement</Text>
              <Text style={styles.sectionHint}>
                Write something you want to feel or believe — something just slightly out of reach. For example: "I am healthy and full of energy" or "I have financial freedom."
              </Text>
              <TextInput
                ref={centerInputRef}
                style={styles.centerInput}
                value={wheel.centerStatement}
                onChangeText={updateCenter}
                placeholder="I am… / I have… / I love…"
                placeholderTextColor="#C9A8E0"
                onFocus={() => setActiveIndex(null)}
                returnKeyType="next"
                onSubmitEditing={() => {
                  inputRefs.current[0]?.focus();
                  setActiveIndex(0);
                }}
              />

              <View style={styles.divider} />

              {/* 12 spokes */}
              <Text style={styles.sectionLabel}>Stepping Stones</Text>
              <Text style={styles.sectionHint}>
                Write 12 thoughts that feel believable and move you gently toward your center statement.
              </Text>
              {wheel.spokes.map((spoke, i) => {
                const active = activeIndex === i;
                const filled = spoke.text.trim().length > 0;
                return (
                  <View
                    key={i}
                    style={[styles.spokeRow, active && styles.spokeRowActive]}
                    onLayout={(e) => { spokeYOffsets.current[i] = e.nativeEvent.layout.y; }}
                  >
                    <View
                      style={[
                        styles.spokeDot,
                        { backgroundColor: SECTOR_COLORS[i] },
                        !filled && styles.spokeDotEmpty,
                      ]}
                    >
                      <Text style={styles.spokeDotNum}>{i + 1}</Text>
                    </View>
                    <TextInput
                      ref={(el) => { inputRefs.current[i] = el; }}
                      style={styles.spokeInput}
                      value={spoke.text}
                      onChangeText={(t) => handleSpokeChange(i, t)}
                      onFocus={() => { setActiveIndex(i); scrollToSpoke(i); }}
                      onBlur={() => setActiveIndex((cur) => cur === i ? null : cur)}
                      placeholder={`Statement ${i + 1}…`}
                      placeholderTextColor="#CDAEE8"
                      multiline
                    />
                  </View>
                );
              })}

              {/* Archive button */}
              <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
                <Text style={styles.archiveBtnText}>Archive & Start New  ✦</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  backBtn:  { padding: 8, width: 80 },
  backText: { fontSize: 20, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular' },
  historyBtn: { padding: 8 },
  historyText: { fontSize: 16, color: '#6B3FA0', fontFamily: 'Nunito_700Bold' },
  wheelWrapper: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  progress: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 60,
  },
  page: {
    backgroundColor: '#FFFCFE',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    shadowColor: '#9B72CC',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sectionHint: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 15,
    color: '#6B3FA0',
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  centerInput: {
    fontSize: 22,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    paddingVertical: 4,
    marginBottom: 4,
    lineHeight: 34,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE0F8',
    marginVertical: 16,
  },
  spokeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8FA',
  },
  spokeRowActive: {
    backgroundColor: '#FAF5FF',
    borderRadius: 10,
    borderBottomColor: 'transparent',
    marginHorizontal: -4,
    paddingHorizontal: 4,
  },
  spokeDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 1,
  },
  spokeDotEmpty: {
    opacity: 0.3,
  },
  spokeDotNum: {
    fontSize: 14,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
  },
  spokeInput: {
    flex: 1,
    fontSize: 18,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    paddingTop: 2,
    paddingBottom: 0,
  },
  spinBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: 'rgba(123, 79, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(123, 79, 166, 0.3)',
  },
  spinBtnText: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_700Bold',
  },
  archiveBtn: {
    marginTop: 28,
    marginBottom: 8,
    backgroundColor: '#7B4FA6',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'center',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  archiveBtnText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Nunito_700Bold',
  },
});
