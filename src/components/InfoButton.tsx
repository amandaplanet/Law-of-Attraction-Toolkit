import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Props {
  /** e.g. "Inspired by Process #6 of Ask and It Is Given" */
  source: string;
  /** Show the "your data stays on device" note */
  showPrivacy?: boolean;
}

const ATTRIBUTION =
  'By Esther and Jerry Hicks\n© Jerry & Esther Hicks\nAbrahamHicks.com · (830) 755-2299';

export default function InfoButton({ source, showPrivacy = false }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity onPress={() => setVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.icon}>ⓘ</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          {/* onStartShouldSetResponder stops taps on the box from bubbling to the overlay */}
          <View style={styles.box} onStartShouldSetResponder={() => true}>
            <Text style={styles.source}>{source}</Text>
            <Text style={styles.attribution}>{ATTRIBUTION}</Text>

            {showPrivacy && (
              <View style={styles.privacyRow}>
                <Text style={styles.privacyText}>
                  🔒{'  '}Your entries are stored only on this device. They are never uploaded or shared.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
              <Text style={styles.closeBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 17,
    color: 'rgba(176, 138, 212, 0.6)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  source: {
    fontSize: 17,
    color: '#4A3060',
    fontFamily: 'Nunito_700Bold',
    textAlign: 'center',
    lineHeight: 24,
  },
  attribution: {
    fontSize: 15,
    color: '#6B3FA0',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  privacyRow: {
    backgroundColor: '#F5EEFF',
    borderRadius: 14,
    padding: 14,
  },
  privacyText: {
    fontSize: 15,
    color: '#4A2A6A',
    fontFamily: 'Nunito_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  closeBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 36,
    backgroundColor: '#E8D5F5',
    borderRadius: 20,
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 17,
    color: '#7B4FA6',
    fontFamily: 'Nunito_700Bold',
  },
});
