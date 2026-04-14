import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { makeNewProcess, saveActiveProcess } from '../storage/thirtyDayStorage';

type Nav   = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'ThirtyDayIntro'>;

const STEPS = [
  {
    emoji: '🧘',
    title: 'Morning Meditation',
    body: 'Settle into stillness. Release all thought and let Source fill the space.',
  },
  {
    emoji: '📖',
    title: 'Book of Positive Aspects',
    body: 'Choose a subject you love and write what you genuinely appreciate about it.',
  },
  {
    emoji: '🎯',
    title: 'Focus Wheel',
    body: 'Choose a desire and build 12 statements of genuine belief around it.',
  },
  {
    emoji: '✨',
    title: 'Check In With Yourself',
    body: 'Notice how you feel before and after. Over time, the shift speaks for itself.',
  },
];

export default function ThirtyDayIntroScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const readOnly   = route.params?.readOnly ?? false;

  const handleBegin = async () => {
    if (readOnly) {
      navigation.goBack();
      return;
    }
    const process = makeNewProcess();
    await saveActiveProcess(process);
    navigation.replace('ThirtyDayDashboard');
  };

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          {/* Decorative stars */}
          <View style={styles.starsRow}>
            <Text style={styles.star}>✦</Text>
            <Text style={[styles.star, styles.starLg]}>✦</Text>
            <Text style={styles.star}>✦</Text>
          </View>

          {/* Label */}
          <Text style={styles.label}>A 30-Day Practice</Text>

          {/* Title */}
          <Text style={styles.title}>Your Morning{'\n'}Ritual</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Intro copy */}
          <Text style={styles.body}>
            Each morning, before you begin your day, spend a few quiet minutes
            with three of the most powerful tools in the Abraham-Hicks toolkit.
          </Text>

          {/* Steps */}
          <View style={styles.steps}>
            {STEPS.map((step, i) => (
              <View key={i} style={styles.stepCard}>
                <Text style={styles.stepEmoji}>{step.emoji}</Text>
                <View style={styles.stepText}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepBody}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Spacer */}
          <View style={{ height: 40 }} />

          {/* CTA */}
          <TouchableOpacity style={styles.cta} onPress={handleBegin} activeOpacity={0.85}>
            <Text style={styles.ctaText}>
              {readOnly ? '← Back to My Practice' : 'Begin My 30 Days'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: '#FAF5FF' },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  backBtn: {
    paddingVertical: 16,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 20,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  star: {
    fontSize: 14,
    color: '#B08AD4',
    opacity: 0.7,
  },
  starLg: {
    fontSize: 22,
    opacity: 1,
  },
  label: {
    fontSize: 13,
    color: '#9B72CC',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontSize: 42,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    textAlign: 'center',
    lineHeight: 64,
    paddingTop: 8,
    marginBottom: 28,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(123,79,166,0.15)',
    marginVertical: 24,
  },
  body: {
    fontSize: 17,
    color: '#5A3A7A',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
    textAlign: 'center',
    marginBottom: 28,
  },
  steps: {
    gap: 12,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(123,79,166,0.12)',
    padding: 16,
    gap: 14,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  stepEmoji: {
    fontSize: 28,
    lineHeight: 34,
  },
  stepText: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 4,
  },
  stepBody: {
    fontSize: 15,
    color: '#7B5FA0',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  cta: {
    backgroundColor: '#7B4FA6',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignSelf: 'center',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  ctaText: {
    fontSize: 18,
    color: '#F3E8FF',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 0.3,
  },
});
