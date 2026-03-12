import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { WorkshopArchiveEntry } from '../types';
import { getAllArchives } from '../storage/workshopStorage';

type Nav = StackNavigationProp<RootStackParamList>;

type ArchiveGroup = {
  archivedAt: string;
  entries: WorkshopArchiveEntry[];
};

// Fallback config for archive entries created before custom-topic support
const BUILTIN_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  body:          { label: 'My Body',          emoji: '🌿', color: '#4CAF50' },
  home:          { label: 'My Home',          emoji: '🏡', color: '#FF9800' },
  relationships: { label: 'My Relationships', emoji: '💗', color: '#E91E63' },
  work:          { label: 'My Work',          emoji: '✨', color: '#7B4FA6' },
};

function entryConfig(entry: WorkshopArchiveEntry) {
  const fallback = BUILTIN_CONFIG[entry.topic];
  return {
    label: entry.topicLabel ?? fallback?.label ?? entry.topic,
    emoji: entry.topicEmoji ?? fallback?.emoji ?? '✨',
    color: entry.topicColor ?? fallback?.color ?? '#9B72CC',
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function groupByDate(entries: WorkshopArchiveEntry[]): ArchiveGroup[] {
  const map = new Map<string, WorkshopArchiveEntry[]>();
  for (const entry of entries) {
    const existing = map.get(entry.archivedAt);
    if (existing) existing.push(entry);
    else map.set(entry.archivedAt, [entry]);
  }
  return Array.from(map.entries())
    .map(([archivedAt, groupEntries]) => ({ archivedAt, entries: groupEntries }))
    .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime());
}

export default function CreativeWorkshopArchiveScreen() {
  const navigation = useNavigation<Nav>();
  const [groups,   setGroups]   = useState<ArchiveGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      getAllArchives().then((entries) => setGroups(groupByDate(entries)));
    }, [])
  );

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <LinearGradient colors={['#E8D5F5', '#FFD6E0']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Archive</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {groups.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No archives yet</Text>
              <Text style={styles.emptyHint}>
                Archived sessions will appear here after you tap "Archive & start fresh."
              </Text>
            </View>
          ) : (
            groups.map((group) => {
              const isOpen = expanded.has(group.archivedAt);
              const totalWants = group.entries.reduce((sum, e) => sum + e.items.length, 0);
              return (
                <View key={group.archivedAt} style={styles.groupCard}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() => toggleExpand(group.archivedAt)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.groupDate}>{formatDate(group.archivedAt)}</Text>
                      <Text style={styles.groupMeta}>
                        {group.entries.length} {group.entries.length === 1 ? 'topic' : 'topics'} · {totalWants} {totalWants === 1 ? 'want' : 'wants'}
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{isOpen ? '˄' : '˅'}</Text>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.groupBody}>
                      {group.entries.map((entry, ei) => {
                        const config = entryConfig(entry);
                        return (
                          <View
                            key={entry.id}
                            style={[styles.topicSection, ei < group.entries.length - 1 && styles.topicSectionBorder]}
                          >
                            <View style={[styles.topicBadge, { backgroundColor: config.color + '22' }]}>
                              <Text style={styles.topicBadgeEmoji}>{config.emoji}</Text>
                              <Text style={[styles.topicBadgeLabel, { color: config.color }]}>{config.label}</Text>
                            </View>
                            {entry.items.map((item, ii) => (
                              <View
                                key={item.id}
                                style={[styles.wantBlock, ii < entry.items.length - 1 && styles.wantBlockBorder]}
                              >
                                <View style={[styles.wantDot, { backgroundColor: config.color }]} />
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.wantText}>{item.want}</Text>
                                  {item.reasons.map((reason, ri) => (
                                    <View key={ri} style={styles.reasonRow}>
                                      <Text style={[styles.reasonBullet, { color: config.color }]}>•</Text>
                                      <Text style={styles.reasonText}>{reason}</Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            ))}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
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
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
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
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#C4A8D4',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupDate: {
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
  },
  groupMeta: {
    fontSize: 15,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
  },
  groupBody: {
    borderTopWidth: 1,
    borderTopColor: '#F0E8F8',
  },
  topicSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  topicSectionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8F8',
  },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 4,
    marginBottom: 4,
  },
  topicBadgeEmoji: { fontSize: 16 },
  topicBadgeLabel: {
    fontSize: 15,
    fontFamily: 'Nunito_700Bold',
  },
  wantBlock: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 6,
  },
  wantBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8F8',
  },
  wantDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    flexShrink: 0,
  },
  wantText: {
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 22,
    marginBottom: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 2,
  },
  reasonBullet: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Nunito_700Bold',
  },
  reasonText: {
    flex: 1,
    fontSize: 16,
    color: '#5A3A70',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
