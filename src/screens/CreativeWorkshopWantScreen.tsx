import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WantItem } from '../types';
import { getWorkshop, updateWantItem, getTopicWants } from '../storage/workshopStorage';

type Nav   = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CreativeWorkshopWant'>;

export default function CreativeWorkshopWantScreen() {
  const navigation        = useNavigation<Nav>();
  const route             = useRoute<Route>();
  const { topic, label, emoji, color, itemId } = route.params;
  const config            = { label, emoji, color };

  const [item,      setItem]      = useState<WantItem | null>(null);
  const [newReason, setNewReason] = useState('');
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      getWorkshop().then((w) => {
        const found = getTopicWants(w, topic).find((i) => i.id === itemId);
        if (found) setItem(found);
      });
    }, [topic, itemId])
  );

  const handleShowInput = () => {
    setShowInput(true);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const handleAddReason = async () => {
    if (!newReason.trim() || !item) return;
    const updated = { ...item, reasons: [...item.reasons, newReason.trim()] };
    await updateWantItem(topic, updated);
    setItem(updated);
    setNewReason('');
    setShowInput(false);
  };

  const handleDeleteReason = async (index: number) => {
    if (!item) return;
    const updated = { ...item, reasons: item.reasons.filter((_, i) => i !== index) };
    await updateWantItem(topic, updated);
    setItem(updated);
  };

  if (!item) return null;

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
            <TouchableOpacity
              onPress={() => navigation.navigate('CreativeWorkshopItem', { topic, label, emoji, color, itemId })}
              style={styles.editBtn}
            >
              <Text style={[styles.editText, { color: config.color }]}>Edit</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Want */}
            <View style={[styles.wantCard, { borderLeftColor: config.color }]}>
              <Text style={styles.wantLabel}>I want...</Text>
              <Text style={styles.wantText}>{item.want}</Text>
            </View>

            {/* Reasons */}
            <Text style={styles.sectionLabel}>Why I want this</Text>

            {item.reasons.length === 0 && !showInput && (
              <Text style={styles.emptyReasons}>
                No reasons yet — tap below to add one.
              </Text>
            )}

            {item.reasons.map((reason, index) => (
              <View key={index} style={styles.reasonRow}>
                <Text style={[styles.reasonNum, { color: config.color }]}>{index + 1}</Text>
                <Text style={styles.reasonText}>{reason}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteReason(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteIcon}>×</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Inline reason input */}
            {showInput && (
              <View style={styles.inputRow}>
                <TextInput
                  ref={inputRef}
                  style={styles.reasonInput}
                  value={newReason}
                  onChangeText={setNewReason}
                  placeholder="Because..."
                  placeholderTextColor="#C4A8D4"
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.inputActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => { setShowInput(false); setNewReason(''); }}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.addReasonBtn,
                      { backgroundColor: config.color },
                      !newReason.trim() && styles.addReasonBtnDisabled,
                    ]}
                    onPress={handleAddReason}
                    disabled={!newReason.trim()}
                  >
                    <Text style={styles.addReasonBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Add reason button */}
          {!showInput && (
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: config.color }]}
              onPress={handleShowInput}
              activeOpacity={0.85}
            >
              <Text style={styles.addBtnText}>+ Add a reason</Text>
            </TouchableOpacity>
          )}
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
  backText: { fontSize: 20, color: '#6B3FA0', fontFamily: 'Nunito_700Bold' },
  title:    { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular', flex: 1, textAlign: 'center' },
  editBtn:  { padding: 8, width: 60, alignItems: 'flex-end' },
  editText: { fontSize: 17, fontFamily: 'Nunito_700Bold' },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  wantCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 16,
    gap: 4,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  wantLabel: {
    fontSize: 15,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  wantText: {
    fontSize: 20,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 26,
  },
  sectionLabel: {
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    marginTop: 8,
  },
  emptyReasons: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reasonNum: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    width: 20,
    marginTop: 1,
  },
  reasonText: {
    flex: 1,
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  deleteIcon: {
    fontSize: 22,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
  },
  inputRow: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  reasonInput: {
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
    minHeight: 70,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 17,
    color: '#6B3FA0',
    fontFamily: 'Nunito_700Bold',
  },
  addReasonBtn: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  addReasonBtnDisabled: { opacity: 0.45 },
  addReasonBtnText: {
    fontSize: 17,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
  addBtn: {
    marginHorizontal: 20,
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
});
