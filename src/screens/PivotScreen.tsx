import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import {
  getPivotDraft, savePivotDraft, archivePivot, getArchivedPivots,
} from '../storage/pivotStorage';
import { usePostHog } from 'posthog-react-native';
import InfoButton from '../components/InfoButton';

type Nav = StackNavigationProp<RootStackParamList>;

export default function PivotScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'Pivot'>>();
  const posthog = usePostHog();
  const source = route.params?.source ?? 'home';

  const [dontWant, setDontWant]   = useState('');
  const [doWants,  setDoWants]    = useState<string[]>(['']);
  const [hasArchive, setHasArchive] = useState(false);

  const scrollRef      = useRef<ScrollView>(null);
  const dontWantRef    = useRef<TextInput>(null);
  const inputRefs      = useRef<Array<TextInput | null>>([]);
  const saveTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doWantsCardY   = useRef(0);

  useFocusEffect(
    useCallback(() => {
      getPivotDraft().then((draft) => {
        if (draft) {
          setDontWant(draft.dontWant);
          setDoWants(draft.doWants.length > 0 ? draft.doWants : ['']);
        }
      });
      getArchivedPivots().then((a) => setHasArchive(a.length > 0));
    }, [])
  );

  // Auto-save draft
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePivotDraft({ dontWant, doWants }), 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [dontWant, doWants]);

  const updateWant = useCallback((index: number, text: string) => {
    setDoWants((prev) => prev.map((w, i) => (i === index ? text : w)));
  }, []);

  const addWant = useCallback(() => {
    setDoWants((prev) => [...prev, '']);
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      setTimeout(() => inputRefs.current[inputRefs.current.length - 1]?.focus(), 80);
    }, 50);
  }, []);

  // On Enter in a do-want field: focus next, or add a new one if on the last
  const handleWantSubmit = useCallback((index: number) => {
    const next = inputRefs.current[index + 1];
    if (next) {
      next.focus();
    } else {
      addWant();
    }
  }, [addWant]);

  const removeWant = useCallback((index: number) => {
    setDoWants((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleArchive = async () => {
    const filledWants = doWants.filter((w) => w.trim());
    if (filledWants.length === 0) {
      Alert.alert('Add a want first', 'Write at least one thing you DO want before archiving.');
      return;
    }
    Alert.alert(
      'Archive this pivot?',
      'It will be saved to your archive and you can start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            await archivePivot({ dontWant: dontWant.trim(), doWants: filledWants });
            posthog.capture('session_archived', { tool: 'pivot', source });
            setDontWant('');
            setDoWants(['']);
            setHasArchive(true);
            scrollRef.current?.scrollTo({ y: 0, animated: true });
          },
        },
      ]
    );
  };

  const hasContent = dontWant.trim() || doWants.some((w) => w.trim());

  return (
    <View style={styles.bg}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText} numberOfLines={1}>‹ Back</Text>
          </TouchableOpacity>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0 }}>
            <Text style={[styles.headerTitle, { textAlign: 'center' }]}>Pivoting</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <InfoButton source="Inspired by Process #16 of Ask and It Is Given" showPrivacy />
            <TouchableOpacity
              onPress={() => navigation.navigate('PivotArchive')}
              style={[styles.archiveBtn, !hasArchive && styles.hidden]}
              disabled={!hasArchive}
            >
              <Text style={styles.archiveBtnText}>Archive ›</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.tagline}>
          "I know what I don't want — so what is it I DO want?"
        </Text>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Don't want */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardLabel}>What I don't want</Text>
              <Text style={styles.cardOptional}>optional</Text>
            </View>
            <Text style={styles.cardHint}>
              You don't have to give it more attention — but naming it can help you pivot. Feel free to skip this.
            </Text>
            <TextInput
              ref={dontWantRef}
              style={styles.dontWantInput}
              value={dontWant}
              onChangeText={(t) => {
                if (t.includes('\n')) {
                  setDontWant(t.replace(/\n/g, ''));
                  inputRefs.current[0]?.focus();
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: doWantsCardY.current, animated: true });
                  }, 300);
                } else {
                  setDontWant(t);
                }
              }}
              placeholder="I don't want…"
              placeholderTextColor="rgba(176,138,212,0.35)"
              multiline
              scrollEnabled={false}
              blurOnSubmit={false}
            />
          </View>

          {/* Pivot arrow */}
          <View style={styles.pivotRow}>
            <View style={styles.pivotLine} />
            <Text style={styles.pivotArrow}>↓  pivot</Text>
            <View style={styles.pivotLine} />
          </View>

          {/* Do wants */}
          <View style={styles.card} onLayout={(e) => { doWantsCardY.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.cardLabel}>What I DO want</Text>
            <Text style={styles.cardHint}>
              Write one or more statements about what you want instead. Keep reaching for the feeling.
            </Text>

            {doWants.map((want, index) => (
              <View key={index} style={styles.wantRow}>
                <View style={styles.wantBullet}>
                  <Text style={styles.wantBulletText}>✦</Text>
                </View>
                <TextInput
                  ref={(el) => { inputRefs.current[index] = el; }}
                  style={styles.wantInput}
                  value={want}
                  onChangeText={(t) => {
                    if (t.includes('\n')) {
                      updateWant(index, t.replace(/\n/g, ''));
                      handleWantSubmit(index);
                    } else {
                      updateWant(index, t);
                    }
                  }}
                  placeholder="I do want…"
                  placeholderTextColor="rgba(176,138,212,0.35)"
                  multiline
                  scrollEnabled={false}
                  blurOnSubmit={false}
                />
                {doWants.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeWant(index)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <TouchableOpacity style={styles.addRow} onPress={addWant}>
              <Text style={styles.addPlus}>＋</Text>
              <Text style={styles.addText}>Add another</Text>
            </TouchableOpacity>
          </View>

          {/* Archive */}
          {hasContent && (
            <TouchableOpacity style={styles.archiveActionBtn} onPress={handleArchive}>
              <Text style={styles.archiveActionText}>Archive & Start Fresh  ✦</Text>
            </TouchableOpacity>
          )}

          {hasContent && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => {
                Alert.alert(
                  'Clear and start over?',
                  'This will erase everything on this page.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: () => {
                        setDontWant('');
                        setDoWants(['']);
                        scrollRef.current?.scrollTo({ y: 0, animated: true });
                      },
                    },
                  ]
                );
              }}
            >
              <Text style={styles.clearBtnText}>Clear and Start Over</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
        </KeyboardAvoidingView>
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
  backBtn:        { padding: 8, width: 80 },
  backText:       { fontSize: 20, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  headerTitle:    { fontSize: 20, color: '#E8D5F5', fontFamily: 'Pacifico_400Regular' },
  archiveBtn:     { padding: 8, alignItems: 'flex-end' },
  archiveBtnText: { fontSize: 16, color: '#B08AD4', fontFamily: 'Nunito_700Bold' },
  hidden:         { opacity: 0 },
  tagline: {
    fontSize: 16,
    color: '#C4A8D4',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 16,
    lineHeight: 24,
  },
  scroll: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    gap: 4,
  },
  card: {
    backgroundColor: '#1A0A2E',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(176,138,212,0.15)',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  cardLabel: {
    fontSize: 13,
    color: '#B08AD4',
    fontFamily: 'Nunito_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cardOptional: {
    fontSize: 12,
    color: 'rgba(176,138,212,0.5)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
  },
  cardHint: {
    fontSize: 14,
    color: 'rgba(196,168,212,0.6)',
    fontFamily: 'Nunito_400Regular',
    fontStyle: 'italic',
    lineHeight: 20,
    marginBottom: 8,
  },
  dontWantInput: {
    fontSize: 17,
    color: 'rgba(240,230,255,0.7)',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 24,
    paddingVertical: 4,
    minHeight: 44,
  },
  // Pivot divider
  pivotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  pivotLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(176,138,212,0.2)',
  },
  pivotArrow: {
    fontSize: 14,
    color: 'rgba(176,138,212,0.55)',
    fontFamily: 'Nunito_700Bold',
    letterSpacing: 1,
  },
  // Do wants
  wantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(176,138,212,0.08)',
  },
  wantBullet: {
    width: 24,
    paddingTop: 4,
    alignItems: 'center',
  },
  wantBulletText: {
    fontSize: 14,
    color: '#9B72CC',
  },
  wantInput: {
    flex: 1,
    fontSize: 18,
    color: '#F0E6FF',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
    paddingTop: 2,
    paddingBottom: 2,
    minHeight: 44,
  },
  removeBtn: {
    paddingTop: 4,
    paddingLeft: 4,
  },
  removeBtnText: {
    fontSize: 22,
    color: 'rgba(176,138,212,0.4)',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 2,
    gap: 8,
  },
  addPlus: {
    fontSize: 20,
    color: '#9B72CC',
    fontFamily: 'Nunito_700Bold',
  },
  addText: {
    fontSize: 16,
    color: '#9B72CC',
    fontFamily: 'Nunito_400Regular',
  },
  archiveActionBtn: {
    marginTop: 24,
    backgroundColor: '#7B4FA6',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignSelf: 'center',
    shadowColor: '#9B72CC',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  archiveActionText: {
    color: '#fff',
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  clearBtnText: {
    fontSize: 15,
    color: '#A080C0',
    fontFamily: 'Nunito_400Regular',
    textDecorationLine: 'underline',
  },
});
