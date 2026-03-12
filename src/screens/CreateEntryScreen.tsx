import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BulletRow from '../components/BulletRow';
import { saveEntry, updateEntry } from '../storage/entriesStorage';
import { Entry, BulletItem } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'CreateEntry'>;
type Route = RouteProp<RootStackParamList, 'CreateEntry'>;

const EMOJI_POOL = ['🌈', '🦋', '💛', '⭐', '🌸', '🌺', '🌟', '🍀', '🌙', '🌻', '🐱', '🐶', '🐰', '🦄'];
const randomEmoji = () => EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)];

function makeId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function CreateEntryScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const existingEntry = route.params?.entry;

  const [topic, setTopic] = useState(existingEntry?.topic ?? '');
  const [bullets, setBullets] = useState<BulletItem[]>(
    existingEntry?.bullets ?? [
      { id: makeId(), emoji: randomEmoji(), text: '' },
    ]
  );
  const [newBulletId, setNewBulletId] = useState<string | null>(null);
  const firstBulletRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (newBulletId) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [newBulletId]);

  const addBullet = useCallback(() => {
    const id = makeId();
    setBullets((prev) => [
      ...prev,
      { id, emoji: randomEmoji(), text: '' },
    ]);
    setNewBulletId(id);
  }, []);

  const updateBulletText = useCallback((id: string, text: string) => {
    setBullets((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }, []);

  const deleteBullet = useCallback((id: string) => {
    setBullets((prev) => {
      const next = prev.filter((b) => b.id !== id);
      return next.map((b, i) => ({
        ...b,
        emoji: b.emoji,
      }));
    });
  }, []);

  const handleSave = async () => {
    if (!topic.trim()) {
      Alert.alert('Topic required', 'Please enter a topic for this entry.');
      return;
    }
    const filledBullets = bullets.filter((b) => b.text.trim());
    if (filledBullets.length === 0) {
      Alert.alert('Nothing to save', 'Add at least one positive aspect.');
      return;
    }

    if (existingEntry) {
      const updated: Entry = { ...existingEntry, topic: topic.trim(), bullets: filledBullets };
      await updateEntry(updated);
      navigation.navigate('Book', { jumpToId: existingEntry.id });
    } else {
      const entry: Entry = {
        id: makeId(),
        topic: topic.trim(),
        bullets: filledBullets,
        createdAt: new Date().toISOString(),
      };
      await saveEntry(entry);
      navigation.navigate('Book', { jumpToId: entry.id });
    }
  };

  return (
    <LinearGradient colors={['#EEE0FA', '#FFD6E0']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {existingEntry ? 'Edit Entry' : 'New Entry'}
            </Text>
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={styles.doneBtn}>
              <Text style={styles.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Journal page */}
            <View style={styles.page}>
              {/* Topic */}
              <TextInput
                style={styles.topicInput}
                value={topic}
                onChangeText={setTopic}
                placeholder="What's your topic?"
                placeholderTextColor="#C9A8E0"
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => firstBulletRef.current?.focus()}
                blurOnSubmit={false}
              />
              <View style={styles.topicDivider} />

              {/* Bullets */}
              {bullets.map((bullet, index) => (
                <BulletRow
                  key={bullet.id}
                  ref={index === 0 ? firstBulletRef : undefined}
                  bullet={bullet}
                  onChange={(text) => updateBulletText(bullet.id, text)}
                  onDelete={() => deleteBullet(bullet.id)}
                  onNewBullet={addBullet}
                  autoFocus={bullet.id === newBulletId}
                />
              ))}

              {/* Add another */}
              <TouchableOpacity style={styles.addRow} onPress={addBullet}>
                <Text style={styles.addPlus}>＋</Text>
                <Text style={styles.addText}>Add another</Text>
              </TouchableOpacity>
            </View>

            {/* Save */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save to My Book  💾</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  backBtn:   { padding: 8, width: 80 },
  doneBtn:   { padding: 8, width: 80, alignItems: 'flex-end' },
  doneBtnText: { fontSize: 17, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
  backText: { fontSize: 20, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular' },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 60,
  },
  page: {
    backgroundColor: '#FFFCFE',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 8,
    shadowColor: '#9B72CC',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 20,
  },
  topicInput: {
    fontSize: 26,
    lineHeight: 38,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    marginBottom: 4,
    paddingVertical: 4,
  },
  topicDivider: {
    height: 2,
    backgroundColor: '#EDE0F8',
    borderRadius: 1,
    marginBottom: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addPlus: {
    fontSize: 22,
    color: '#6B3FA0',
    fontFamily: 'Nunito_700Bold',
  },
  addText: {
    fontSize: 18,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
  },
  saveBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 32,
    alignSelf: 'center',
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 19,
    fontFamily: 'Nunito_700Bold',
  },
});
