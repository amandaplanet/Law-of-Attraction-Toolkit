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
import WheelView from '../components/WheelView';
import { FocusWheel } from '../types';
import { getArchivedWheels } from '../storage/focusWheelStorage';

function shortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function FocusWheelArchiveScreen() {
  const navigation = useNavigation();
  const [wheels, setWheels] = useState<FocusWheel[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => {
    getArchivedWheels().then(setWheels);
  }, []));

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <LinearGradient colors={['#EEE0FA', '#FFF3CD']} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wheel Archive</Text>
          <View style={{ width: 70 }} />
        </View>

        {wheels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎡</Text>
            <Text style={styles.emptyTitle}>No archived wheels yet</Text>
            <Text style={styles.emptyBody}>
              Complete a Focus Wheel and tap "Archive & Start New" to save it here.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.count}>
              {wheels.length} {wheels.length === 1 ? 'wheel' : 'wheels'} archived
            </Text>

            {wheels.map((wheel) => {
              const expanded = expandedIds.has(wheel.id);
              const filled = wheel.spokes.filter((s) => s.text.trim()).length;
              const date = shortDate(wheel.archivedAt ?? wheel.createdAt);

              return (
                <View key={wheel.id} style={styles.card}>
                  {/* Collapsed header row */}
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => toggleExpand(wheel.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.cardCenter} numberOfLines={2}>
                        {wheel.centerStatement || '(no center statement)'}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {date}  ·  {filled}/12 spokes
                      </Text>
                    </View>
                    <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {/* Expanded detail */}
                  {expanded && (
                    <View style={styles.cardBody}>
                      <View style={styles.wheelRow}>
                        <WheelView
                          spokes={wheel.spokes}
                          centerStatement={wheel.centerStatement}
                          size={220}
                        />
                      </View>

                      {wheel.spokes.filter((s) => s.text.trim()).map((spoke) => (
                        <View key={spoke.index} style={styles.spokeRow}>
                          <Text style={styles.spokeNum}>{spoke.index + 1}</Text>
                          <Text style={styles.spokeText}>{spoke.text}</Text>
                        </View>
                      ))}
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
  backBtn:  { padding: 8, width: 80 },
  backText: { fontSize: 20, color: '#7B4FA6', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#4A3060', fontFamily: 'Pacifico_400Regular' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 22, color: '#4A3060', fontFamily: 'Pacifico_400Regular', marginBottom: 10 },
  emptyBody: {
    fontSize: 17,
    color: '#7B4FA6',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  scroll: { padding: 18, paddingBottom: 48 },
  count: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFCFE',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#9B72CC',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardHeaderText: { flex: 1, marginRight: 8 },
  cardCenter: {
    fontSize: 18,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    marginBottom: 3,
  },
  cardMeta: { fontSize: 15, color: '#6B3FA0', fontFamily: 'Nunito_400Regular' },
  chevron: { fontSize: 16, color: '#7B4FA6' },
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  wheelRow: { alignItems: 'center', marginBottom: 16 },
  spokeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0E8FA',
  },
  spokeNum: {
    fontSize: 15,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
    width: 22,
    marginTop: 2,
  },
  spokeText: {
    flex: 1,
    fontSize: 17,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 22,
  },
});
