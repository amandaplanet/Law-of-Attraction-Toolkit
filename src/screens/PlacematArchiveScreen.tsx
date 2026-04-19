import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ArchivedPlacematItem } from '../types';
import { getArchivedItems } from '../storage/placematStorage';

function shortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return 'Today';
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function dateKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

function listEmoji(list: ArchivedPlacematItem['list']): string {
  if (list === 'mine') return '✋';
  if (list === 'universe') return '✨';
  return '📋';
}

function listColor(list: ArchivedPlacematItem['list']): string {
  if (list === 'mine') return '#4A3060';
  if (list === 'universe') return '#1A3A5C';
  return '#6B8A9A';
}

export default function PlacematArchiveScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<ArchivedPlacematItem[]>([]);

  useFocusEffect(useCallback(() => {
    getArchivedItems().then(setItems);
  }, []));

  // Group items by date (most recent first)
  const groups: { dateLabel: string; key: string; items: ArchivedPlacematItem[] }[] = [];
  for (const item of items) {
    const key = dateKey(item.archivedAt);
    const existing = groups.find((g) => g.key === key);
    if (existing) {
      existing.items.push(item);
    } else {
      groups.push({ key, dateLabel: shortDate(item.archivedAt), items: [item] });
    }
  }

  return (
    <LinearGradient colors={['#E8F4FD', '#EEE0FA']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>Placemat Archive</Text>
          <View style={{ width: 80 }} />
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>Nothing archived yet</Text>
            <Text style={styles.emptyBody}>
              Swipe left on tasks to archive them, or tap "Archive & Start Fresh" to clear your whole list.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.count}>
              {items.length} {items.length === 1 ? 'task' : 'tasks'} archived
            </Text>

            {groups.map((group) => (
              <View key={group.key} style={styles.group}>
                <Text style={styles.dateHeader}>{group.dateLabel}</Text>
                <View style={styles.card}>
                  {group.items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={[styles.itemRow, idx > 0 && styles.itemRowBorder]}
                    >
                      <Text style={styles.itemEmoji}>{listEmoji(item.list)}</Text>
                      <Text
                        style={[
                          styles.itemText,
                          { color: listColor(item.list) },
                          item.done && styles.doneText,
                        ]}
                      >
                        {item.text}
                      </Text>
                      {item.done && <Text style={styles.doneCheck}>✓</Text>}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
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
    paddingBottom: 8,
  },
  backBtn: { padding: 8, width: 80 },
  backText: { fontSize: 20, color: '#4A7FA6', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular', flex: 1, textAlign: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, color: '#4A3060', fontFamily: 'Pacifico_400Regular', marginBottom: 10 },
  emptyBody: { fontSize: 17, color: '#5A7A9A', fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 24 },
  scroll: { padding: 18, paddingBottom: 48, gap: 20 },
  count: { fontSize: 15, color: '#5A7A9A', fontFamily: 'Nunito_400Regular', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  group: { gap: 8 },
  dateHeader: { fontSize: 14, color: '#7B4FA6', fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#B0C8D8',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  itemRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
  },
  itemEmoji: { fontSize: 16 },
  itemText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
  doneText: { textDecorationLine: 'line-through', color: '#A0A8B0' },
  doneCheck: { fontSize: 15, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
});
