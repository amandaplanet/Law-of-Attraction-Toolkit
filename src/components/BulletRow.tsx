import React, { useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { BulletItem } from '../types';

type Props = {
  bullet: BulletItem;
  onChange: (text: string) => void;
  onDelete: () => void;
  onNewBullet?: () => void;
  editable?: boolean;
  autoFocus?: boolean;
};

const BulletRow = React.forwardRef<TextInput, Props>(function BulletRow({
  bullet,
  onChange,
  onDelete,
  onNewBullet,
  editable = true,
  autoFocus = false,
}, ref) {
  const internalRef = useRef<TextInput>(null);

  // Combine forwarded ref and internal ref
  const setRef = (node: TextInput | null) => {
    (internalRef as React.MutableRefObject<TextInput | null>).current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<TextInput | null>).current = node;
  };

  // Focus after render instead of via autoFocus prop, to avoid layout jerk
  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => internalRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <View style={styles.row}>
      <Text style={styles.emoji}>{bullet.emoji}</Text>
      {editable ? (
        <TextInput
          ref={setRef}
          style={styles.input}
          value={bullet.text}
          onChangeText={(text) => {
            if (text.includes('\n')) {
              onChange(text.replace(/\n/g, ''));
              onNewBullet?.();
            } else {
              onChange(text);
            }
          }}
          placeholder="What do you appreciate?"
          placeholderTextColor="#CDAEE8"
          multiline
          scrollEnabled={false}
        />
      ) : (
        <Text style={styles.displayText}>{bullet.text}</Text>
      )}
      {editable && (
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default BulletRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE0F8',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 26,
    marginRight: 12,
    width: 26,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    fontSize: 19,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
    minHeight: 26,
    paddingTop: 2,
    paddingBottom: 2,
  },
  displayText: {
    flex: 1,
    fontSize: 19,
    color: '#2E1A47',
    fontFamily: 'Nunito_400Regular',
    lineHeight: 26,
  },
  deleteBtn: {
    paddingLeft: 12,
    paddingTop: 3,
  },
  deleteText: {
    fontSize: 17,
    color: '#9B72CC',
  },
});
