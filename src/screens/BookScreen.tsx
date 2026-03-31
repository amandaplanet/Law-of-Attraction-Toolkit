import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import TableOfContents from '../components/TableOfContents';
import EntryPage from '../components/EntryPage';
import { getEntries, deleteEntry } from '../storage/entriesStorage';
import { Entry } from '../types';

type Nav = StackNavigationProp<RootStackParamList, 'Book'>;
type Route = RouteProp<RootStackParamList, 'Book'>;

const DOT_WINDOW = 7;

function getVisibleDots(currentPage: number, totalPages: number) {
  if (totalPages <= DOT_WINDOW) {
    return Array.from({ length: totalPages }, (_, i) => ({
      page: i,
      size: i === currentPage ? 'lg' : 'md' as 'lg' | 'md' | 'sm',
    }));
  }
  let start = currentPage - Math.floor(DOT_WINDOW / 2);
  start = Math.max(0, Math.min(start, totalPages - DOT_WINDOW));
  return Array.from({ length: DOT_WINDOW }, (_, i) => {
    const page = start + i;
    const edgeHasMore = (i === 0 && start > 0) || (i === DOT_WINDOW - 1 && start + DOT_WINDOW < totalPages);
    return {
      page,
      size: page === currentPage ? 'lg' : edgeHasMore ? 'sm' : 'md' as 'lg' | 'md' | 'sm',
    };
  });
}

export default function BookScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const pagerRef = useRef<PagerView>(null);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  const loadEntries = useCallback(async () => {
    const data = await getEntries();
    setEntries(data);
    return data;
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries().then((data) => {
        const jumpId = route.params?.jumpToId;
        if (jumpId) {
          const idx = data.findIndex((e) => e.id === jumpId);
          if (idx !== -1) {
            setTimeout(() => pagerRef.current?.setPage(idx + 1), 100);
          }
        }
      });
    }, [loadEntries, route.params?.jumpToId])
  );

  const handleSelectEntry = (index: number) => {
    pagerRef.current?.setPage(index + 1);
  };

  const handleEditEntry = (entry: Entry) => {
    navigation.navigate('CreateEntry', { entry });
  };

  const handleDeleteEntry = async (entry: Entry) => {
    await deleteEntry(entry.id);
    const updated = entries.filter((e) => e.id !== entry.id);
    setEntries(updated);
    pagerRef.current?.setPage(0);
  };

  const totalPages = entries.length + 1;

  const pageLabel =
    currentPage === 0
      ? 'Table of Contents'
      : entries[currentPage - 1]
      ? entries[currentPage - 1].topic
      : '';

  const canGoPrev = currentPage > 0;
  const canGoNext = currentPage < totalPages - 1;


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => currentPage === 0 ? navigation.goBack() : pagerRef.current?.setPage(0)}
          style={styles.backBtn}
        >
          <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerLabel} numberOfLines={1}>
          {pageLabel}
        </Text>
        <Text style={styles.pageCount}>
          {currentPage + 1}/{totalPages}
        </Text>
      </View>

      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        onPageSelected={(e) => setCurrentPage(e.nativeEvent.position)}
      >
        <View key="toc" style={styles.page}>
          <TableOfContents
            entries={entries}
            onSelect={handleSelectEntry}
            onNewEntry={() => navigation.navigate('CreateEntry')}
          />
        </View>

        {entries.map((entry) => (
          <View key={entry.id} style={styles.page}>
            <EntryPage
              entry={entry}
              onEdit={() => handleEditEntry(entry)}
              onDelete={() => handleDeleteEntry(entry)}
            />
          </View>
        ))}
      </PagerView>

      {/* Footer: chevrons + dots */}
      {totalPages > 1 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.footerChevron}
            onPress={() => canGoPrev && pagerRef.current?.setPage(currentPage - 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.footerChevronText, !canGoPrev && styles.chevronHidden]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.dotsRow}>
            {getVisibleDots(currentPage, totalPages).map(({ page, size }) => (
              <TouchableOpacity
                key={page}
                onPress={() => pagerRef.current?.setPage(page)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <View style={[styles.dot, styles[`dot_${size}`]]} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.footerChevron}
            onPress={() => canGoNext && pagerRef.current?.setPage(currentPage + 1)}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.footerChevronText, !canGoNext && styles.chevronHidden]}>›</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(232, 213, 245, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: '#D4B8E8',
  },
  backBtn: {
    padding: 6,
    width: 80,
  },
  backText: {
    fontSize: 20,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
  },
  headerLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    marginHorizontal: 8,
  },
  pageCount: {
    fontSize: 16,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    width: 50,
    textAlign: 'right',
  },

  pager: { flex: 1 },
  page:  { flex: 1 },

  // Footer
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(232, 213, 245, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#D4B8E8',
  },
  footerChevron: {
    width: 32,
    alignItems: 'center',
  },
  footerChevronText: {
    fontSize: 28,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
    lineHeight: 34,
  },
  chevronHidden: {
    opacity: 0,
  },
  dotsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    borderRadius: 10,
    backgroundColor: '#C4A8D4',
  },
  dot_lg: { width: 9,  height: 9,  borderRadius: 5,  backgroundColor: '#7B4FA6' },
  dot_md: { width: 7,  height: 7,  borderRadius: 4,  backgroundColor: '#C4A8D4' },
  dot_sm: { width: 5,  height: 5,  borderRadius: 3,  backgroundColor: '#C4A8D4', opacity: 0.5 },
});
