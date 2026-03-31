import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WantItem } from '../types';
import { getWorkshop, saveWantItem, updateWantItem, deleteWantItem, archiveTopic, getTopicWants } from '../storage/workshopStorage';

type Nav   = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CreativeWorkshopTopic'>;

export default function CreativeWorkshopTopicScreen() {
  const navigation = useNavigation<Nav>();
  const route      = useRoute<Route>();
  const { topic, label, emoji, color } = route.params;
  const config     = { label, emoji, color };

  const [items, setItems] = useState<WantItem[]>([]);

  // Add want
  const [showAddWant, setShowAddWant]   = useState(false);
  const [newWantText, setNewWantText]   = useState('');
  const wantInputRef = useRef<TextInput>(null);

  // Inline reason input
  const [addingReasonFor, setAddingReasonFor] = useState<string | null>(null);
  const [newReasonText,   setNewReasonText]   = useState('');
  const reasonInputRef = useRef<TextInput>(null);

  // Inline want editing
  const [editingWantId,   setEditingWantId]   = useState<string | null>(null);
  const [editingWantText, setEditingWantText] = useState('');
  const editInputRef = useRef<TextInput>(null);

  // Inline reason editing (key = `${wantId}-${index}`)
  const [editingReasonKey,  setEditingReasonKey]  = useState<string | null>(null);
  const [editingReasonText, setEditingReasonText] = useState('');
  const editReasonInputRef = useRef<TextInput>(null);

  const scrollRef = useRef<ScrollView>(null);
  const cardYOffsets = useRef<Record<string, number>>({});
  const cardHeights = useRef<Record<string, number>>({});
  const addingWantRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      getWorkshop().then((w) => setItems(getTopicWants(w, topic)));
    }, [topic])
  );

  useEffect(() => {
    if (!showAddWant) return;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, [showAddWant]);

  useEffect(() => {
    if (!addingReasonFor) return;
    setTimeout(() => reasonInputRef.current?.focus(), 80);
  }, [addingReasonFor]);

  useEffect(() => {
    if (editingWantId) setTimeout(() => editInputRef.current?.focus(), 80);
  }, [editingWantId]);

  // ── Want actions ────────────────────────────────────────────────────────────

  const handleAddWant = async (textOverride?: string) => {
    if (addingWantRef.current) return;
    const text = textOverride ?? newWantText;
    if (!text.trim()) return;
    addingWantRef.current = true;
    const item: WantItem = {
      id: Date.now().toString(),
      want: text.trim(),
      reasons: [],
      createdAt: new Date().toISOString(),
    };
    await saveWantItem(topic, item);
    setItems((prev) => [...prev, item]);
    setNewWantText('');
    setShowAddWant(false);
    setAddingReasonFor(item.id);
    setNewReasonText('');
    addingWantRef.current = false;
  };

  const handleDeleteWant = async (id: string) => {
    await deleteWantItem(topic, id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (addingReasonFor === id) setAddingReasonFor(null);
    if (editingWantId === id)   setEditingWantId(null);
  };

  const handleSaveWantEdit = async (id: string) => {
    if (!editingWantText.trim()) { setEditingWantId(null); return; }
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const updated = { ...item, want: editingWantText.trim() };
    await updateWantItem(topic, updated);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    setEditingWantId(null);
  };

  // ── Reason actions ──────────────────────────────────────────────────────────

  const scrollToCardBottom = (_wantId: string) => {
    scrollRef.current?.scrollToEnd({ animated: true });
  };

  const handleAddReason = async (wantId: string, keepOpen = false, textOverride?: string) => {
    const text = textOverride ?? newReasonText;
    if (!text.trim()) return;
    const item = items.find((i) => i.id === wantId);
    if (!item) return;
    const updated = { ...item, reasons: [...item.reasons, text.trim()] };
    await updateWantItem(topic, updated);
    setItems((prev) => prev.map((i) => (i.id === wantId ? updated : i)));
    setNewReasonText('');
    if (!keepOpen) {
      setAddingReasonFor(null);
    } else {
      setTimeout(() => {
        reasonInputRef.current?.focus();
        scrollToCardBottom(wantId);
      }, 80);
    }
  };

  const handleSaveReasonEdit = async (wantId: string, index: number) => {
    const item = items.find((i) => i.id === wantId);
    if (!item) return;
    const trimmed = editingReasonText.trim();
    if (trimmed) {
      const updated = { ...item, reasons: item.reasons.map((r, i) => i === index ? trimmed : r) };
      await updateWantItem(topic, updated);
      setItems((prev) => prev.map((i) => (i.id === wantId ? updated : i)));
    }
    setEditingReasonKey(null);
  };

  const handleDeleteReason = async (wantId: string, index: number) => {
    const item = items.find((i) => i.id === wantId);
    if (!item) return;
    const updated = { ...item, reasons: item.reasons.filter((_, i) => i !== index) };
    await updateWantItem(topic, updated);
    setItems((prev) => prev.map((i) => (i.id === wantId ? updated : i)));
  };

  // ── Archive ─────────────────────────────────────────────────────────────────

  const handleArchive = () => {
    if (items.length === 0) return;
    Alert.alert(
      'Archive & start fresh?',
      'Your current wants will be saved to the archive. You can view them any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await archiveTopic(topic);
            setItems([]);
            setShowAddWant(false);
            setAddingReasonFor(null);
            setEditingWantId(null);
          },
        },
      ]
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={['#E8D5F5', '#FFD6E0']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{config.emoji} {config.label}</Text>
            <View style={{ width: 60 }} />
          </View>

          <Text style={styles.instructions}>
            Write down a few things you want for this topic and a few reasons for each one. Focus on how good it will feel to have them.
          </Text>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (addingReasonFor) scrollRef.current?.scrollToEnd({ animated: true });
            }}
          >
            {/* Empty state */}
            {items.length === 0 && !showAddWant && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>What do you want to create?</Text>
                <Text style={styles.emptyHint}>Tap the button below to get started.</Text>
              </View>
            )}

            {/* Want cards */}
            {items.map((item) => (
              <View
                key={item.id}
                style={[styles.wantCard, { borderLeftColor: config.color }]}
                onLayout={(e) => {
                  cardYOffsets.current[item.id] = e.nativeEvent.layout.y;
                  cardHeights.current[item.id] = e.nativeEvent.layout.height;
                }}
              >

                {/* Want text row */}
                <View style={styles.wantHeader}>
                  {editingWantId === item.id ? (
                    <>
                      <TextInput
                        ref={editInputRef}
                        style={[styles.wantText, styles.wantEditInput]}
                        value={editingWantText}
                        onChangeText={setEditingWantText}
                        multiline
                        textAlignVertical="top"
                      />
                      <TouchableOpacity
                        onPress={() => handleSaveWantEdit(item.id)}
                        style={styles.checkBtn}
                      >
                        <Text style={[styles.checkMark, { color: config.color }]}>✓</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => {
                          setEditingWantId(item.id);
                          setEditingWantText(item.want);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.wantText}>{item.want}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteWant(item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.deleteX}>×</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                {/* Reasons */}
                {item.reasons.map((reason, i) => {
                  const key = `${item.id}-${i}`;
                  return (
                    <View key={i} style={styles.reasonRow}>
                      <Text style={[styles.reasonBullet, { color: config.color }]}>•</Text>
                      {editingReasonKey === key ? (
                        <TextInput
                          ref={editReasonInputRef}
                          style={[styles.reasonText, styles.reasonEditInput]}
                          value={editingReasonText}
                          onChangeText={setEditingReasonText}
                          onBlur={() => handleSaveReasonEdit(item.id, i)}
                          autoFocus
                          multiline
                        />
                      ) : (
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => { setEditingReasonKey(key); setEditingReasonText(reason); }}>
                          <Text style={styles.reasonText}>{reason}</Text>
                        </TouchableOpacity>
                      )}
                      {editingReasonKey !== key && (
                        <TouchableOpacity
                          onPress={() => handleDeleteReason(item.id, i)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text style={styles.deleteXSmall}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* Inline reason input */}
                {addingReasonFor === item.id ? (
                  <View>
                    <View style={styles.reasonInputRow}>
                      <Text style={[styles.reasonBullet, { color: config.color }]}>•</Text>
                      <TextInput
                        ref={reasonInputRef}
                        style={styles.reasonInput}
                        value={newReasonText}
                        onChangeText={(text) => {
                          if (text.includes('\n')) {
                            const trimmed = text.replace(/\n/g, '');
                            setNewReasonText('');
                            handleAddReason(item.id, true, trimmed);
                          } else {
                            setNewReasonText(text);
                          }
                        }}
                        placeholder="Because..."
                        placeholderTextColor="#C4A8D4"
                        multiline
                        blurOnSubmit={false}
                      />
                    </View>
                    <View style={styles.reasonInputActions}>
                      <TouchableOpacity
                        onPress={() => { setAddingReasonFor(null); setNewReasonText(''); }}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.smallAddBtn,
                          { backgroundColor: config.color },
                          !newReasonText.trim() && { opacity: 0.4 },
                        ]}
                        onPress={() => handleAddReason(item.id, false)}
                        disabled={!newReasonText.trim()}
                      >
                        <Text style={styles.smallAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => {
                      setAddingReasonFor(item.id);
                      setNewReasonText('');
                    }}
                    style={styles.addReasonLink}
                  >
                    <Text style={[styles.addReasonLinkText, { color: config.color }]}>
                      + add a reason
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Inline add want input */}
            {showAddWant && (
              <View style={[styles.addWantInput, { borderLeftColor: config.color }]}>
                <TextInput
                  ref={wantInputRef}
                  style={styles.addWantText}
                  value={newWantText}
                  autoFocus
                  onChangeText={(text) => {
                    if (text.includes('\n')) {
                      handleAddWant(text.replace(/\n/g, ''));
                    } else {
                      setNewWantText(text);
                    }
                  }}
                  placeholder="I want..."
                  placeholderTextColor="#C4A8D4"
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.addWantActions}>
                  <TouchableOpacity
                    onPress={() => { setShowAddWant(false); setNewWantText(''); }}
                  >
                    <Text style={styles.cancelText}>Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.smallAddBtn,
                      { backgroundColor: config.color },
                      !newWantText.trim() && { opacity: 0.4 },
                    ]}
                    onPress={() => handleAddWant()}
                    disabled={!newWantText.trim()}
                  >
                    <Text style={styles.smallAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Add want button — inside ScrollView so it never overlaps content */}
            {!showAddWant && (
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: config.color }]}
                onPress={() => {
                  setAddingReasonFor(null);
                  setNewReasonText('');
                  setShowAddWant(true);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.addBtnText}>+ Add a want</Text>
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
  safe:     { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn:  { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#6B3FA0', fontFamily: 'Nunito_700Bold' },
  title:       { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular', flex: 1, textAlign: 'center' },
  instructions: {
    fontSize: 17,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 28,
    paddingBottom: 12,
    lineHeight: 23,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 24,
    gap: 12,
  },

  emptyBox: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 10,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Want card
  wantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    gap: 8,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  wantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  wantText: {
    flex: 1,
    fontSize: 18,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 22,
  },
  wantEditInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0D0F0',
    paddingBottom: 2,
    minHeight: 44,
  },
  checkBtn:  { paddingLeft: 4 },
  checkMark: { fontSize: 22, fontFamily: 'Nunito_700Bold' },
  deleteX:   { fontSize: 22, color: '#9B72CC', lineHeight: 24 },

  // Reasons
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
    gap: 8,
  },
  reasonBullet: {
    fontSize: 16,
    lineHeight: 21,
    fontFamily: 'Nunito_700Bold',
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    color: '#6A5080',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 21,
    fontStyle: 'italic',
  },
  deleteXSmall: { fontSize: 20, color: '#9B72CC', lineHeight: 22 },
  reasonEditInput: {
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D0F0',
    minHeight: 32,
  },

  // Inline reason input
  reasonInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 4,
    gap: 8,
  },
  reasonInput: {
    flex: 1,
    fontSize: 16,
    color: '#4A3060',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 21,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0D0F0',
    paddingBottom: 4,
  },
  reasonInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  addReasonLink: { paddingLeft: 4, paddingTop: 2 },
  addReasonLinkText: {
    fontSize: 16,
    fontFamily: 'Nunito_700Bold',
  },

  // Shared
  cancelText: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_700Bold',
  },
  smallAddBtn: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  smallAddBtnText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },

  // Add want input
  addWantInput: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 14,
    gap: 10,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addWantText: {
    fontSize: 18,
    color: '#4A3060',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
    minHeight: 60,
  },
  addWantActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },

  addBtn: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addBtnText: {
    fontSize: 20,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
  archiveLink: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  archiveLinkText: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    textDecorationLine: 'underline',
  },
});
