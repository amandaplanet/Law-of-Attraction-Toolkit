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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import BulletRow from '../components/BulletRow';
import { saveEntry, updateEntry, deleteEntry } from '../storage/entriesStorage';
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
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ID for this editing session
  const entryIdRef = useRef<string>(existingEntry?.id ?? makeId());
  // True once the entry exists in storage (always true when editing an existing entry)
  const hasPersistedRef = useRef<boolean>(!!existingEntry);

  // Auto-save to real storage as user types
  useEffect(() => {
    const hasContent = topic.trim() || bullets.some((b) => b.text.trim());
    if (!hasContent) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const entry: Entry = {
        id: entryIdRef.current,
        topic: topic.trim() || 'Untitled',
        bullets: bullets.filter((b) => b.text.trim()),
        createdAt: existingEntry?.createdAt ?? new Date().toISOString(),
      };
      if (!hasPersistedRef.current) {
        await saveEntry(entry);
        hasPersistedRef.current = true;
      } else {
        await updateEntry(entry);
      }
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [topic, bullets]);

  useEffect(() => {
    if (newBulletId) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [newBulletId]);

  const addBullet = useCallback(() => {
    const id = makeId();
    setBullets((prev) => [...prev, { id, emoji: randomEmoji(), text: '' }]);
    setNewBulletId(id);
  }, []);

  const updateBulletText = useCallback((id: string, text: string) => {
    setBullets((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }, []);

  const deleteBullet = useCallback((id: string) => {
    setBullets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const handleDone = () => {
    if (existingEntry) {
      navigation.navigate('Book', { jumpToId: existingEntry.id });
    } else {
      navigation.navigate('Book');
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
            <View style={{ width: 80 }} />
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Journal page */}
            <View style={styles.page}>
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

              <TouchableOpacity style={styles.addRow} onPress={addBullet}>
                <Text style={styles.addPlus}>＋</Text>
                <Text style={styles.addText}>Add another</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleDone}>
              <Text style={styles.saveBtnText}>Done (for now)  ✨</Text>
            </TouchableOpacity>

            {/* Only show for new entries with content */}
            {!existingEntry && (topic.trim() !== '' || bullets.some((b) => b.text.trim() !== '')) && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  Alert.alert(
                    'Clear and start over?',
                    'This will erase everything on this page.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: async () => {
                          if (hasPersistedRef.current) {
                            await deleteEntry(entryIdRef.current);
                            hasPersistedRef.current = false;
                          }
                          entryIdRef.current = makeId();
                          setTopic('');
                          setBullets([{ id: makeId(), emoji: randomEmoji(), text: '' }]);
                        },
                      },
                    ]
                  );
                }}
              >
                <Text style={styles.clearBtnText}>Clear and Start Over</Text>
              </TouchableOpacity>
            )}
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
  backBtn: { padding: 8, width: 80 },
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
  clearBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  clearBtnText: {
    fontSize: 15,
    color: '#A080C0',
    fontFamily: 'Nunito_400Regular',
    textDecorationLine: 'underline',
  },
});
