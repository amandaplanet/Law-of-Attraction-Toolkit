import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { getWorkshop, saveWantItem, updateWantItem, deleteWantItem, getTopicWants } from '../storage/workshopStorage';

type Nav   = StackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'CreativeWorkshopItem'>;

export default function CreativeWorkshopItemScreen() {
  const navigation       = useNavigation<Nav>();
  const route            = useRoute<Route>();
  const { topic, label, emoji, color, itemId } = route.params;
  const config           = { label, emoji, color };
  const isEditing        = !!itemId;

  const [want,      setWant]      = useState('');
  const [reasons,   setReasons]   = useState<string[]>([]);
  const [createdAt, setCreatedAt] = useState('');

  useEffect(() => {
    if (!isEditing) return;
    getWorkshop().then((w) => {
      const item = getTopicWants(w, topic).find((i) => i.id === itemId);
      if (item) {
        setWant(item.want);
        setReasons(item.reasons);
        setCreatedAt(item.createdAt);
      }
    });
  }, []);

  const handleSave = async () => {
    if (!want.trim()) return;
    if (isEditing) {
      await updateWantItem(topic, {
        id: itemId!,
        want: want.trim(),
        reasons,
        createdAt,
      });
    } else {
      await saveWantItem(topic, {
        id: Date.now().toString(),
        want: want.trim(),
        reasons: [],
        createdAt: new Date().toISOString(),
      });
    }
    navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Delete this want?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteWantItem(topic, itemId!);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={['#E8D5F5', '#FFD6E0']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>{config.emoji} {config.label}</Text>
            {isEditing ? (
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 60 }} />
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.fieldLabel}>What do you want?</Text>
            <TextInput
              style={[styles.input, styles.wantInput]}
              value={want}
              onChangeText={setWant}
              placeholder="I want..."
              placeholderTextColor="#C4A8D4"
              multiline
              autoFocus={!isEditing}
              textAlignVertical="top"
            />
            <Text style={styles.fieldHint}>
              You can add your reasons after saving.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: config.color },
              !want.trim() && styles.saveBtnDisabled,
            ]}
            onPress={handleSave}
            disabled={!want.trim()}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {isEditing ? 'Save changes' : 'Add to workshop'}
            </Text>
          </TouchableOpacity>
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
  backText:   { fontSize: 20, color: '#6B3FA0', fontFamily: 'Nunito_700Bold' },
  title:      { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular', flex: 1, textAlign: 'center' },
  deleteBtn:  { padding: 8, width: 60, alignItems: 'flex-end' },
  deleteText: { fontSize: 16, color: '#E53935', fontFamily: 'Nunito_700Bold' },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  fieldLabel: {
    fontSize: 18,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    marginTop: 20,
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 15,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    color: '#4A3060',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    minHeight: 90,
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  wantInput: {
    minHeight: 130,
  },
  saveBtn: {
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
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    fontSize: 20,
    color: '#fff',
    fontFamily: 'Nunito_700Bold',
  },
});
