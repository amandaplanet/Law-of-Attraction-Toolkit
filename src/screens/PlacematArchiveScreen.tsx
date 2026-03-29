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
import { Placemat } from '../types';
import { getArchivedPlacemats } from '../storage/placematStorage';

function shortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function PlacematArchiveScreen() {
  const navigation = useNavigation();
  const [placemats, setPlacemats] = useState<Placemat[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    getArchivedPlacemats().then(setPlacemats);
  }, []));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

        {placemats.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>✨</Text>
            <Text style={styles.emptyTitle}>No archived lists yet</Text>
            <Text style={styles.emptyBody}>
              Tap "Archive & Start Fresh" on your placemat to save it here.
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.count}>
              {placemats.length} {placemats.length === 1 ? 'placemat' : 'placemats'} archived
            </Text>

            {placemats.map((p) => {
              const expanded = expandedIds.has(p.id);
              const mine     = p.items.filter((i) => i.list === 'mine');
              const universe = p.items.filter((i) => i.list === 'universe');
              const inbox    = p.items.filter((i) => i.list === 'inbox');
              const date     = shortDate(p.createdAt);

              return (
                <View key={p.id} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(p.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.cardDate}>{date}</Text>
                      <Text style={styles.cardMeta}>
                        ✋ {mine.length}  ·  ✨ {universe.length}
                        {inbox.length > 0 ? `  ·  📋 ${inbox.length} unsorted` : ''}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={styles.cardBody}>
                      {mine.length > 0 && (
                        <>
                          <Text style={styles.listLabel}>✋ I handled this</Text>
                          {mine.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                              <Text style={[styles.itemText, item.done && styles.doneText]}>
                                {item.done ? '✓ ' : '• '}{item.text}
                              </Text>
                            </View>
                          ))}
                        </>
                      )}
                      {universe.length > 0 && (
                        <>
                          <Text style={[styles.listLabel, { color: '#4A90D9', marginTop: mine.length > 0 ? 12 : 0 }]}>✨ Universe handled this</Text>
                          {universe.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                              <Text style={[styles.itemText, { color: '#4A70A0' }, item.done && styles.doneText]}>
                                {item.done ? '✓ ' : '• '}{item.text}
                              </Text>
                            </View>
                          ))}
                        </>
                      )}
                      {inbox.length > 0 && (
                        <>
                          <Text style={[styles.listLabel, { color: '#8A9AAA', marginTop: 12 }]}>📋 Unsorted</Text>
                          {inbox.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                              <Text style={[styles.itemText, { color: '#8A9AAA' }]}>• {item.text}</Text>
                            </View>
                          ))}
                        </>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
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
  emptyBody: { fontSize: 17, color: '#5A7A9A', fontFamily: 'Nunito_400Regular', textAlign: 'center', lineHeight: 22 },
  scroll: { padding: 18, paddingBottom: 48 },
  count: { fontSize: 16, color: '#5A7A9A', fontFamily: 'Nunito_400Regular', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#B0C8D8',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cardDate: { fontSize: 18, color: '#2E1A47', fontFamily: 'Nunito_700Bold', marginBottom: 3 },
  cardMeta: { fontSize: 15, color: '#5A7A9A', fontFamily: 'Nunito_400Regular' },
  chevron: { fontSize: 16, color: '#7B4FA6' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  listLabel: { fontSize: 14, color: '#7B4FA6', fontFamily: 'Nunito_700Bold', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  itemRow: { paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#F0F4F8' },
  itemText: { fontSize: 16, color: '#2E3A4A', fontFamily: 'Nunito_400Regular', lineHeight: 22 },
  doneText: { textDecorationLine: 'line-through', color: '#A0A8B0' },
});
