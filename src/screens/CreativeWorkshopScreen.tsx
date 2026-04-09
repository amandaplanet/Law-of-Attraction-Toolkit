import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Modal,
  ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkshopTopic, CustomTopic, Workshop } from '../types';
import { getWorkshop, archiveAllTopics, addCustomTopic, deleteCustomTopic } from '../storage/workshopStorage';
import InfoButton from '../components/InfoButton';

type Nav = StackNavigationProp<RootStackParamList>;

const TOPICS: { key: WorkshopTopic; label: string; emoji: string; color: string }[] = [
  { key: 'body',          label: 'My Body',          emoji: '🌿', color: '#4CAF50' },
  { key: 'home',          label: 'My Home',          emoji: '🏡', color: '#FF9800' },
  { key: 'relationships', label: 'My Relationships', emoji: '💗', color: '#E91E63' },
  { key: 'work',          label: 'My Work',          emoji: '✨', color: '#7B4FA6' },
];

const EMOJI_OPTIONS = ['🌙', '💰', '🎓', '🏃', '🎭', '🌊', '🎯', '🌺', '⚡', '🦋', '🎵', '🌈', '🐱', '🐶', '🐰', '🦄'];

const EMPTY: Workshop = { body: [], home: [], relationships: [], work: [], customTopics: [], archive: [] };

export default function CreativeWorkshopScreen() {
  const navigation = useNavigation<Nav>();
  const [workshop, setWorkshop] = useState<Workshop>(EMPTY);

  // Add-topic modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newLabel, setNewLabel]         = useState('');
  const [newEmoji, setNewEmoji]         = useState('🌙');

  useFocusEffect(
    useCallback(() => {
      getWorkshop().then(setWorkshop);
    }, [])
  );

  const hasAnyWants =
    TOPICS.some((t) => workshop[t.key].length > 0) ||
    workshop.customTopics.some((ct) => ct.wants.length > 0);
  const hasArchive = workshop.archive.length > 0;

  const navigateToTopic = (topic: string, label: string, emoji: string, color: string) => {
    navigation.navigate('CreativeWorkshopTopic', { topic, label, emoji, color });
  };

  const handleArchiveAll = () => {
    Alert.alert(
      'Archive & start fresh?',
      'All current wants will be saved to the archive. You can view them any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await archiveAllTopics();
            getWorkshop().then(setWorkshop);
          },
        },
      ]
    );
  };

  const handleCreateTopic = async () => {
    if (!newLabel.trim()) return;
    await addCustomTopic(newLabel.trim(), newEmoji);
    setModalVisible(false);
    setNewLabel('');
    setNewEmoji('🌙');
    getWorkshop().then(setWorkshop);
  };

  const handleDeleteCustomTopic = (ct: CustomTopic) => {
    Alert.alert(
      `Delete "${ct.label}"?`,
      ct.wants.length > 0
        ? 'This will permanently delete this topic and all its wants.'
        : undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomTopic(ct.id);
            getWorkshop().then(setWorkshop);
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#E8D5F5', '#FFD6E0']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Creative Workshop</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <InfoButton source="Inspired by Process #3 of Ask and It Is Given" showPrivacy />
            <TouchableOpacity
              onPress={() => navigation.navigate('CreativeWorkshopArchive')}
              style={[styles.historyBtn, !hasArchive && styles.hidden]}
              disabled={!hasArchive}
            >
              <Text style={styles.historyText}>Archive</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.subtitle}>What would you like to create?</Text>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {/* Built-in topics */}
          {TOPICS.map((topic) => {
            const count = workshop[topic.key].length;
            return (
              <TouchableOpacity
                key={topic.key}
                style={[styles.card, { borderColor: topic.color + '55' }]}
                onPress={() => navigateToTopic(topic.key, topic.label, topic.emoji, topic.color)}
                activeOpacity={0.85}
              >
                <Text style={styles.cardEmoji}>{topic.emoji}</Text>
                <Text style={styles.cardLabel}>{topic.label}</Text>
                <Text style={[styles.cardCount, { color: topic.color }]}>
                  {count === 0 ? 'Nothing yet' : `${count} ${count === 1 ? 'want' : 'wants'}`}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom topics */}
          {workshop.customTopics.map((ct) => {
            const count = ct.wants.length;
            return (
              <View key={ct.id} style={[styles.card, { borderColor: ct.color + '55' }]}>
                <TouchableOpacity
                  style={styles.cardInner}
                  onPress={() => navigateToTopic(ct.id, ct.label, ct.emoji, ct.color)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.cardEmoji}>{ct.emoji}</Text>
                  <Text style={styles.cardLabel}>{ct.label}</Text>
                  <Text style={[styles.cardCount, { color: ct.color }]}>
                    {count === 0 ? 'Nothing yet' : `${count} ${count === 1 ? 'want' : 'wants'}`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteTopicBtn}
                  onPress={() => handleDeleteCustomTopic(ct)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.deleteTopicText}>×</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Add custom topic card */}
          <TouchableOpacity
            style={[styles.card, styles.addCard]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Text style={styles.addCardPlus}>+</Text>
            <Text style={styles.addCardLabel}>Custom topic</Text>
          </TouchableOpacity>
        </ScrollView>

        {hasAnyWants && (
          <TouchableOpacity onPress={handleArchiveAll} style={styles.archiveLink}>
            <Text style={styles.archiveLinkText}>Archive & start fresh</Text>
          </TouchableOpacity>
        )}

        {/* Add topic modal */}
        <Modal visible={modalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>New Topic</Text>
              <TextInput
                style={styles.modalInput}
                value={newLabel}
                onChangeText={setNewLabel}
                placeholder="What would you like to create?"
                placeholderTextColor="#C4A8D4"
                autoFocus
                maxLength={30}
                returnKeyType="done"
                onSubmitEditing={handleCreateTopic}
              />
              <View style={styles.emojiGrid}>
                {EMOJI_OPTIONS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setNewEmoji(e)}
                    style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnSelected]}
                  >
                    <Text style={styles.emojiText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => { setModalVisible(false); setNewLabel(''); setNewEmoji('🌙'); }}
                >
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalCreate, !newLabel.trim() && { opacity: 0.4 }]}
                  disabled={!newLabel.trim()}
                  onPress={handleCreateTopic}
                >
                  <Text style={styles.modalCreateText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  backBtn:     { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#6B3FA0', fontFamily: 'Nunito_700Bold' },
  title:       { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular', flex: 1, textAlign: 'center' },
  historyBtn:  { padding: 8, alignItems: 'flex-end' },
  historyText: { fontSize: 16, color: '#6B3FA0', fontFamily: 'Nunito_700Bold' },
  hidden:      { opacity: 0 },
  subtitle: {
    fontSize: 17,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Flexible wrapping grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 24,
  },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    paddingVertical: 24,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardInner: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: { fontSize: 34 },
  cardLabel: {
    fontSize: 16,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  cardCount: {
    fontSize: 15,
    fontFamily: 'Nunito_400Regular',
  },
  deleteTopicBtn: {
    position: 'absolute',
    top: -10,
    right: -10,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  deleteTopicText: {
    fontSize: 18,
    color: '#9B72CC',
    lineHeight: 22,
  },
  addCard: {
    borderColor: 'rgba(155, 114, 204, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center',
    shadowOpacity: 0,
    elevation: 0,
  },
  addCardPlus: {
    fontSize: 32,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
  },
  addCardLabel: {
    fontSize: 15,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  archiveLink: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingBottom: 20,
  },
  archiveLinkText: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    textDecorationLine: 'underline',
  },
  // Modal
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
    padding: 24,
    width: '100%',
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
  modalInput: {
    fontSize: 18,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    borderBottomWidth: 2,
    borderBottomColor: '#E8D5F5',
    paddingVertical: 6,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5EEFF',
  },
  emojiBtnSelected: {
    backgroundColor: '#D4B0F0',
  },
  emojiText: { fontSize: 22 },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
  },
  modalCancel: {
    fontSize: 17,
    color: '#9B72CC',
    fontFamily: 'Nunito_700Bold',
  },
  modalCreate: {
    backgroundColor: '#7B4FA6',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  modalCreateText: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
});
