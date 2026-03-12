import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Entry } from '../types';

type Props = {
  entries: Entry[];
  onSelect: (index: number) => void;
  onNewEntry: () => void;
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

export default function TableOfContents({ entries, onSelect, onNewEntry }: Props) {
  return (
    <LinearGradient colors={['#E8D5F5', '#FFD6E0']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <Text style={styles.title}>My Book of</Text>
        <Text style={styles.titleLine2}>Positive Aspects</Text>

        {/* New entry button — always at top */}
        <TouchableOpacity style={styles.newBtn} onPress={onNewEntry}>
          <Text style={styles.newBtnText}>✏️  Add New Entry</Text>
        </TouchableOpacity>

        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌸</Text>
            <Text style={styles.emptyBody}>
              Write your first entry — pick a topic you love and list what you appreciate about it.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.count}>
              {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
            </Text>

            {/* Compact list card */}
            <View style={styles.listCard}>
              {entries.map((entry, index) => (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.row,
                    index < entries.length - 1 && styles.rowBorder,
                  ]}
                  onPress={() => onSelect(index)}
                >
                  <Text style={styles.rowNum}>{index + 1}</Text>
                  <Text style={styles.rowTopic} numberOfLines={1}>{entry.topic}</Text>
                  <Text style={styles.rowDate}>{shortDate(entry.createdAt)}</Text>
                  <Text style={styles.rowArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    color: '#4A3060',
    fontFamily: 'Pacifico_400Regular',
  },
  titleLine2: {
    fontSize: 30,
    color: '#4A3060',
    fontFamily: 'Pacifico_400Regular',
    marginBottom: 20,
  },
  newBtn: {
    backgroundColor: '#7B4FA6',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    marginBottom: 20,
    shadowColor: '#7B4FA6',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  newBtnText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
  },
  count: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listCard: {
    backgroundColor: '#FFFCFE',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#9B72CC',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6FA',
  },
  rowNum: {
    fontSize: 16,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
    width: 22,
  },
  rowTopic: {
    flex: 1,
    fontSize: 17,
    color: '#2E1A47',
    fontFamily: 'Nunito_700Bold',
    marginRight: 8,
  },
  rowDate: {
    fontSize: 15,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    marginRight: 6,
  },
  rowArrow: {
    fontSize: 20,
    color: '#7B4FA6',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 20,
  },
  emptyEmoji: {
    fontSize: 52,
    marginBottom: 14,
  },
  emptyBody: {
    fontSize: 17,
    color: '#7B4FA6',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
