import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { T } from './T';

interface Props {
  role: 'assistant' | 'patient';
  text: string;
  extra?: { label: string; text: string }[];
  onEdit?: () => void;
  editLabel?: string;
  badge?: string;
}

export function ChatBubble({ role, text, extra, onEdit, editLabel, badge }: Props) {
  const mine = role === 'patient';
  const sub = mine ? '#D5F5F0' : colors.muted;
  return (
    <View style={[styles.row, mine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
      {!mine ? <View style={styles.avatar}><T variant="small">🩺</T></View> : null}
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        <T variant="body" color={mine ? '#fff' : colors.text}>{text}</T>
        {extra?.map((e) => <T key={e.label + e.text} variant="small" color={sub} style={{ marginTop: 6 }}>{e.label ? `${e.label}: ` : ''}{e.text}</T>)}
        {badge ? <T variant="caption" color={sub} style={{ marginTop: 4 }}>{badge}</T> : null}
      </View>
      {onEdit ? (
        <Pressable accessibilityRole="button" accessibilityLabel={editLabel} onPress={onEdit} style={styles.edit} hitSlop={8}>
          <T variant="small" bold color={colors.tealDark}>✎</T>
        </Pressable>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10, gap: 6 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20 },
  mine: { backgroundColor: colors.teal, borderBottomRightRadius: 6 },
  theirs: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  edit: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center' },
});
