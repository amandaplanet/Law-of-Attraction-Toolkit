import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { usePostHog } from 'posthog-react-native';

type Nav = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const posthog = usePostHog();
  const [aboutVisible, setAboutVisible] = useState(false);

  const handleShare = async () => {
    await Share.share({
      message: 'Check out this Law of Attraction toolkit app! https://apps.apple.com/app/id6738063860',
    });
  };

  return (
    <LinearGradient colors={['#E8D5F5', '#FFD6E0']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Law of Attraction</Text>
          <Text style={styles.title2}>Toolkit</Text>

          <ScrollView style={styles.cardArea} contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('EmotionalGuidanceScale')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>🌈</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Emotional Guidance Scale</Text>
                <Text style={styles.cardDesc}>
                  Find the right exercise for where you are
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: 'Meditation', source: 'home' }); navigation.navigate('Meditation'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>🧘</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Meditation Timer</Text>
                <Text style={styles.cardDesc}>
                  10, 15, or 20 minutes to clear your mind and connect
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: '68-Second Focus', source: 'home' }); navigation.navigate('SixtyEightSecond'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>⏱️</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>68-Second Focus</Text>
                <Text style={styles.cardDesc}>
                  Hold a thought through 4 phases of momentum
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: 'Book of Positive Aspects', source: 'home' }); navigation.navigate('Book'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>📖</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Book of Positive Aspects</Text>
                <Text style={styles.cardDesc}>
                  Choose a topic and write what you love about it
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: 'Focus Wheel', source: 'home' }); navigation.navigate('FocusWheel'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>🎯</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Focus Wheel</Text>
                <Text style={styles.cardDesc}>
                  Align with 12 stepping-stone statements
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: 'Creative Workshop', source: 'home' }); navigation.navigate('CreativeWorkshop'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>🎨</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Creative Workshop</Text>
                <Text style={styles.cardDesc}>
                  Clarify what you want and why you want it
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: 'Placemat Process', source: 'home' }); navigation.navigate('Placemat'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>🍽️</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Placemat Process</Text>
                <Text style={styles.cardDesc}>
                  Decide what's yours to do — and hand the rest to the Universe
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => { posthog.capture('tool_opened', { tool: 'Pivoting', source: 'home' }); navigation.navigate('Pivot'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>🔄</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>Pivoting</Text>
                <Text style={styles.cardDesc}>
                  Turn "I don't want this" into "what I DO want instead"
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, styles.cardProgress]}
              onPress={() => navigation.navigate('Report')}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>📊</Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>My Journey</Text>
                <Text style={styles.cardDesc}>
                  Track your emotional level and practice over time
                </Text>
              </View>
              <Text style={styles.cardArrow}>›</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.footerRow}>
            <Text style={styles.footer}>Feel good. Right now. Always.</Text>
            <TouchableOpacity onPress={() => setAboutVisible(true)}>
              <Text style={styles.aboutLink}>About</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal visible={aboutVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>About</Text>
              <Text style={styles.modalBody}>
                This app is an independent project and is not created by, affiliated with, or endorsed by Abraham-Hicks Publications.{'\n\n'}The teachings, processes, and concepts referenced in this app are by Abraham-Hicks, © Jerry & Esther Hicks. For more information, visit AbrahamHicks.com or call (830) 755-2299.{'\n\n'}This app is created by a fan for the community, out of love for the teachings.
              </Text>
              <TouchableOpacity style={styles.modalShare} onPress={handleShare}>
                <Text style={styles.modalShareText}>Share with a friend 💌</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalClose} onPress={() => setAboutVisible(false)}>
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  tagline: {
    fontSize: 18,
    color: '#A88FC0',
    fontFamily: 'Nunito_400Regular',
    marginBottom: 4,
  },
  title: {
    fontSize: 40,
    color: '#4A3060',
    fontFamily: 'Pacifico_400Regular',
    lineHeight: 58,
  },
  title2: {
    fontSize: 40,
    color: '#C07BC0',
    fontFamily: 'Pacifico_400Regular',
    lineHeight: 58,
    marginBottom: 36,
  },
  cardArea: {
    flex: 1,
  },
  cardContent: {
    gap: 14,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardDark: {
    backgroundColor: '#1A0A2E',
    shadowColor: '#0A0015',
  },
  cardProgress: {
    backgroundColor: '#EDE0F8',
    borderWidth: 1,
    borderColor: 'rgba(123, 79, 166, 0.2)',
  },
  cardEmoji: { fontSize: 36, marginRight: 16 },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 20,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 4,
  },
  cardTitleDark: { color: '#E8D5F5' },
  cardDesc: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  cardDescDark: { color: '#6A4A8A' },
  cardArrow: {
    fontSize: 28,
    color: '#7B4FA6',
    marginLeft: 8,
  },
  cardArrowDark: { color: '#4A2A70' },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  footer: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  aboutLink: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  modalTitle: {
    fontSize: 20,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 17,
    color: '#4A2A6A',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    textAlign: 'center',
  },
  modalShare: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: '#7B4FA6',
    borderRadius: 20,
  },
  modalShareText: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
  modalClose: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 32,
    backgroundColor: '#E8D5F5',
    borderRadius: 20,
  },
  modalCloseText: {
    fontSize: 17,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
  },
});
