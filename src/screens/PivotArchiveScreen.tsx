import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getArchivedPivots } from '../storage/pivotStorage';
import { PivotEntry } from '../types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function PivotArchiveScreen() {
  const navigation = useNavigation();
  const [entries, setEntries] = useState<PivotEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getArchivedPivots().then(setEntries);
    }, [])
  );

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pivot Archive</Text>
          <View style={{ width: 80 }} />
        </View>

        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔄</Text>
            <Text style={styles.emptyTitle}>No pivots yet</Text>
            <Text style={styles.emptyText}>
              Your archived pivots will appear here after you archive them from the Pivoting screen.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          >
            {entries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text style={styles.date}>{formatDate(entry.createdAt)}</Text>

                {entry.dontWant ? (
                  <View style={styles.dontWantRow}>
                    <Text style={styles.dontWantLabel}>didn't want  </Text>
                    <Text style={styles.dontWantText}>{entry.dontWant}</Text>
                  </View>
                ) : null}

                {entry.dontWant ? (
                  <View style={styles.pivotDivider}>
                    <View style={styles.pivotLine} />
                    <Text style={styles.pivotArrow}>↓</Text>
                    <View style={styles.pivotLine} />
                  </View>
                ) : null}

                <View style={styles.doWants}>
                  {entry.doWants.map((want, i) => (
                    <View key={i} style={styles.wantRow}>
                      <Text style={styles.wantBullet}>✦</Text>
                      <Text style={styles.wantText}>{want}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg:   { flex: 1, backgroundColor: '#0F0720' },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn:     { padding: 8, width: 80 },
  backText:    { fontSize: 20, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  headerTitle: { fontSize: 20, color: '#E8D5F5', fontFamily: 'Pacifico_400Regular' },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    fontSize: 20,
    color: '#E8D5F5',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  list: {
    paddingHorizontal: 18,
    paddingTop: 4,
    gap: 14,
  },
  card: {
    backgroundColor: '#1A0A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 10,
  },
  date: {
    fontSize: 12,
    color: 'rgba(176,138,212,0.5)',
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  dontWantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  dontWantLabel: {
    fontSize: 13,
    color: 'rgba(176,138,212,0.5)',
    fontFamily: 'Nunito_700Bold',
    fontStyle: 'italic',
  },
  dontWantText: {
    flex: 1,
    fontSize: 15,
    color: 'rgba(240,230,255,0.55)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  pivotDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  pivotLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(176,138,212,0.15)',
  },
  pivotArrow: {
    fontSize: 13,
    color: 'rgba(176,138,212,0.4)',
  },
  doWants: { gap: 8 },
  wantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  wantBullet: {
    fontSize: 12,
    color: '#9B72CC',
    paddingTop: 4,
  },
  wantText: {
    flex: 1,
    fontSize: 17,
    color: '#E8D5F5',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
  },
});
