import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { PlacematItem, Placemat } from '../types';
import { getDraft, saveDraft, archivePlacemat, makeEmptyPlacemat } from '../storage/placematStorage';
import { usePostHog } from 'posthog-react-native';

type Nav = StackNavigationProp<RootStackParamList>;

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function PlacematScreen() {
  const navigation = useNavigation<Nav>();
  const posthog = usePostHog();
  const [placemat, setPlacemat] = useState<Placemat>(makeEmptyPlacemat());
  const [newItemText, setNewItemText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const addInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(useCallback(() => {
    getDraft().then((d) => { if (d) setPlacemat(d); });
  }, []));

  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveDraft(placemat), 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [placemat]);

  const updateItems = (fn: (items: PlacematItem[]) => PlacematItem[]) => {
    setPlacemat((p) => ({ ...p, items: fn(p.items) }));
  };

  const addItem = () => {
    if (!newItemText.trim()) return;
    const item: PlacematItem = {
      id: makeId(),
      text: newItemText.trim(),
      list: 'inbox',
      done: false,
    };
    updateItems((items) => [...items, item]);
    setNewItemText('');
  };

  const assign = (id: string, list: 'mine' | 'universe') => {
    updateItems((items) => items.map((i) => i.id === id ? { ...i, list } : i));
  };

  const moveTo = (id: string, list: 'mine' | 'universe') => {
    updateItems((items) => items.map((i) => i.id === id ? { ...i, list, done: false } : i));
  };

  const toggleDone = (id: string) => {
    updateItems((items) => items.map((i) => i.id === id ? { ...i, done: !i.done } : i));
  };

  const deleteItem = (id: string) => {
    updateItems((items) => items.filter((i) => i.id !== id));
  };

  const updateItemText = (id: string, text: string) => {
    updateItems((items) => items.map((i) => i.id === id ? { ...i, text } : i));
  };

  const handleArchive = () => {
    if (placemat.items.length === 0) return;
    Alert.alert(
      'Archive & start fresh?',
      'Your current placemat will be saved to the archive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await archivePlacemat(placemat);
            posthog.capture('session_archived', { tool: 'placemat' });
            setPlacemat(makeEmptyPlacemat());
          },
        },
      ]
    );
  };

  const inbox    = placemat.items.filter((i) => i.list === 'inbox');
  const mine     = placemat.items.filter((i) => i.list === 'mine');
  const universe = placemat.items.filter((i) => i.list === 'universe');
  const hasItems = placemat.items.length > 0;

  return (
    <LinearGradient colors={['#E8F4FD', '#EEE0FA']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Placemat</Text>
            <TouchableOpacity onPress={() => navigation.navigate('PlacematArchive')} style={styles.archiveLink}>
              <Text style={styles.archiveLinkText}>Archive ›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>What's on your plate today?</Text>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >

            {/* ── Inbox ── */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>📋</Text>
                <Text style={styles.sectionTitle}>Everything on your mind</Text>
                {inbox.length > 0 && <View style={[styles.badge, styles.badgeInbox]}><Text style={styles.badgeText}>{inbox.length}</Text></View>}
              </View>
              <Text style={styles.sectionHint}>Add everything — then decide who handles it: you ✋ or the Universe ✨</Text>

              {inbox.map((item) => (
                <View key={item.id} style={styles.inboxRow}>
                  {editingId === item.id ? (
                    <TextInput
                      style={[styles.inboxText, styles.inlineEdit]}
                      value={item.text}
                      onChangeText={(t) => updateItemText(item.id, t)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      multiline
                    />
                  ) : (
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingId(item.id)}>
                      <Text style={styles.inboxText}>{item.text}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.assignBtn, styles.assignBtnMe]}
                    onPress={() => assign(item.id, 'mine')}
                  >
                    <Text style={styles.assignBtnText}>✋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.assignBtn, styles.assignBtnUniverse]}
                    onPress={() => assign(item.id, 'universe')}
                  >
                    <Text style={styles.assignBtnText}>✨</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteItem(item.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.deleteX}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add input */}
              <View style={styles.addRow}>
                <TextInput
                  ref={addInputRef}
                  style={styles.addInput}
                  value={newItemText}
                  onChangeText={setNewItemText}
                  placeholder="Add an item…"
                  placeholderTextColor="#A8C4D4"
                  returnKeyType="done"
                  blurOnSubmit={false}
                  onSubmitEditing={addItem}
                />
                <TouchableOpacity
                  style={[styles.addBtn, !newItemText.trim() && { opacity: 0.35 }]}
                  onPress={addItem}
                  disabled={!newItemText.trim()}
                >
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ── My List ── */}
            <View style={[styles.section, styles.sectionMine]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>✋</Text>
                <Text style={[styles.sectionTitle, { color: '#4A3060' }]}>I'll handle this today</Text>
                {mine.length > 0 && <View style={[styles.badge, styles.badgeMine]}><Text style={styles.badgeText}>{mine.length}</Text></View>}
              </View>
              <Text style={styles.sectionHint}>Keep this list short and realistic.</Text>

              {mine.length === 0 && (
                <Text style={styles.emptyHint}>Assign items from above with ✋</Text>
              )}
              {mine.map((item) => (
                <View key={item.id} style={styles.checkedRow}>
                  <TouchableOpacity onPress={() => toggleDone(item.id)} style={styles.checkbox}>
                    {item.done
                      ? <Text style={[styles.checkmark, { color: '#7B4FA6' }]}>✓</Text>
                      : <View style={[styles.checkCircle, { borderColor: '#7B4FA6' }]} />
                    }
                  </TouchableOpacity>
                  {editingId === item.id ? (
                    <TextInput
                      style={[styles.checkedText, styles.inlineEdit]}
                      value={item.text}
                      onChangeText={(t) => updateItemText(item.id, t)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      multiline
                    />
                  ) : (
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingId(item.id)}>
                      <Text style={[styles.checkedText, item.done && styles.doneText]}>{item.text}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.moveBtn, { borderColor: '#4A90D9' }]}
                    onPress={() => moveTo(item.id, 'universe')}
                  >
                    <Text style={[styles.moveBtnText, { color: '#4A90D9' }]}>→ ✨</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* ── Universe's List ── */}
            <View style={[styles.section, styles.sectionUniverse]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>✨</Text>
                <Text style={[styles.sectionTitle, { color: '#1A3A5C' }]}>Universe will handle this</Text>
                {universe.length > 0 && <View style={[styles.badge, styles.badgeUniverse]}><Text style={[styles.badgeText, { color: '#fff' }]}>{universe.length}</Text></View>}
              </View>
              <Text style={[styles.sectionHint, { color: '#4A6080' }]}>Let go and trust. These are handled.</Text>

              {universe.length === 0 && (
                <Text style={[styles.emptyHint, { color: '#7090B0' }]}>Assign items from above with ✨</Text>
              )}
              {universe.map((item) => (
                <View key={item.id} style={styles.checkedRow}>
                  <TouchableOpacity onPress={() => toggleDone(item.id)} style={styles.checkbox}>
                    {item.done
                      ? <Text style={[styles.checkmark, { color: '#4A90D9' }]}>✓</Text>
                      : <View style={[styles.checkCircle, { borderColor: '#4A90D9' }]} />
                    }
                  </TouchableOpacity>
                  {editingId === item.id ? (
                    <TextInput
                      style={[styles.checkedText, styles.inlineEdit]}
                      value={item.text}
                      onChangeText={(t) => updateItemText(item.id, t)}
                      onBlur={() => setEditingId(null)}
                      autoFocus
                      multiline
                    />
                  ) : (
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingId(item.id)}>
                      <Text style={[styles.checkedText, item.done && styles.doneText]}>{item.text}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.moveBtn, { borderColor: '#7B4FA6' }]}
                    onPress={() => {
                      Alert.alert(
                        'Reassign to yourself?',
                        'If you feel inspired to take action on this, reassign it to yourself.',
                        [
                          { text: 'Leave it to the Universe', style: 'cancel' },
                          {
                            text: "I'm inspired to do this today",
                            onPress: () => moveTo(item.id, 'mine'),
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.moveBtnText, { color: '#7B4FA6' }]}>→ ✋</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Archive */}
            {hasItems && (
              <TouchableOpacity style={styles.archiveBtn} onPress={handleArchive}>
                <Text style={styles.archiveBtnText}>Archive & Start Fresh  ✦</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  backBtn: { padding: 8, flex: 1 },
  archiveLink: { padding: 8, flex: 1, alignItems: 'flex-end' },
  archiveLinkText: { fontSize: 15, color: '#4A7FA6', fontFamily: 'Nunito_700Bold' },
  backText: { fontSize: 20, color: '#4A7FA6', fontFamily: 'Nunito_700Bold' },
  title: { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular', flex: 1, textAlign: 'center' },
  subtitle: {
    fontSize: 17,
    color: '#5A7A9A',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 28,
    paddingBottom: 12,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Sections
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#B0C8D8',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    gap: 8,
  },
  sectionMine: {
    borderTopWidth: 3,
    borderTopColor: '#7B4FA6',
  },
  sectionUniverse: {
    backgroundColor: '#F0F7FF',
    borderTopWidth: 3,
    borderTopColor: '#4A90D9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionEmoji: { fontSize: 20 },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    color: '#2A4A6A',
    fontFamily: 'Nunito_700Bold',
  },
  sectionHint: {
    fontSize: 15,
    color: '#6B8A9A',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  emptyHint: {
    fontSize: 15,
    color: '#A0B8C8',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    paddingVertical: 4,
  },

  // Badges
  badge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeInbox:    { backgroundColor: '#E0EEF8' },
  badgeMine:     { backgroundColor: '#EDE0F8' },
  badgeUniverse: { backgroundColor: '#4A90D9' },
  badgeText: { fontSize: 13, color: '#4A3060', fontFamily: 'Nunito_700Bold' },

  // Inbox rows
  inboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },
  inboxText: {
    flex: 1,
    fontSize: 16,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  assignBtn: {
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  assignBtnMe:       { backgroundColor: '#9B5FD6' },
  assignBtnUniverse: { backgroundColor: '#2A78C8' },
  assignBtnText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#fff' },
  deleteX: { fontSize: 20, color: '#B0C0CC', lineHeight: 24 },

  // Add row
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  addInput: {
    flex: 1,
    fontSize: 16,
    color: '#2E3A4A',
    fontFamily: 'Nunito_400Regular',
    borderBottomWidth: 1,
    borderBottomColor: '#C8DDE8',
    paddingVertical: 6,
  },
  addBtn: {
    backgroundColor: '#5A8FAA',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addBtnText: { fontSize: 15, color: '#fff', fontFamily: 'Nunito_700Bold' },

  // Checked rows (Mine + Universe)
  checkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF4F8',
  },
  checkbox: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  checkmark: { fontSize: 18, fontFamily: 'Nunito_700Bold' },
  checkedText: {
    flex: 1,
    fontSize: 16,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  doneText: {
    textDecorationLine: 'line-through',
    color: '#A0A8B0',
  },
  moveBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  moveBtnText: { fontSize: 13, fontFamily: 'Nunito_700Bold' },
  inlineEdit: {
    flex: 1,
    padding: 0,
  },

  // Archive
  archiveBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'center',
    marginTop: 8,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  archiveBtnText: { color: '#fff', fontSize: 17, fontFamily: 'Nunito_700Bold' },
});
