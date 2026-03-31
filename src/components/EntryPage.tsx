import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import BulletRow from './BulletRow';
import { Entry } from '../types';

type Props = {
  entry: Entry;
  onEdit: () => void;
  onDelete: () => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function EntryPage({ entry, onEdit, onDelete }: Props) {
  const handleDelete = () => {
    Alert.alert(
      'Delete this entry?',
      `"${entry.topic}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };
  return (
    <LinearGradient colors={['#EEE0FA', '#FFD6E0']} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          {/* Title row */}
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.topic}>{entry.topic}</Text>
              <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>
            </View>
            <View style={styles.entryBtns}>
              <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
                <Text style={styles.editText}>✏️ Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.topicDivider} />

          {entry.bullets.map((bullet) => (
            <BulletRow
              key={bullet.id}
              bullet={bullet}
              onChange={() => {}}
              onDelete={() => {}}
              editable={false}
            />
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: {
    padding: 18,
    paddingTop: 24,
    paddingBottom: 40,
  },
  page: {
    backgroundColor: '#FFFCFE',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: '#9B72CC',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleBlock: { flex: 1, marginRight: 12 },
  topic: {
    fontSize: 28,
    color: '#2E1A47',
    fontFamily: 'Pacifico_400Regular',
    lineHeight: 46,
  },
  date: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  entryBtns: {
    gap: 6,
    alignItems: 'flex-end',
    marginTop: 4,
  },
  editBtn: {
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editText: {
    fontSize: 15,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
  },
  deleteBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  deleteText: {
    fontSize: 13,
    color: '#C47090',
    fontFamily: 'Nunito_400Regular',
    textDecorationLine: 'underline',
  },
  topicDivider: {
    height: 2,
    backgroundColor: '#EDE0F8',
    borderRadius: 1,
    marginBottom: 4,
  },
});
