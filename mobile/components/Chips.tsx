import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, radius } from '../constants/theme';
import { T } from './T';

interface Props { options: string[]; onPress: (o: string) => void; scroll?: boolean; leading?: React.ReactNode }

export function Chips({ options, onPress, scroll, leading }: Props) {
  const chips = (
    <>
      {leading}
      {options.map((o) => (
        <Pressable key={o} accessibilityRole="button" accessibilityLabel={o} onPress={() => onPress(o)}
          style={({ pressed }) => [styles.chip, pressed && { backgroundColor: colors.tealSoft2 }]}>
          <T variant="small" bold color={colors.tealDark}>{o}</T>
        </Pressable>
      ))}
    </>
  );
  if (scroll) {
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollRow} style={{ flexGrow: 0 }}>{chips}</ScrollView>;
  }
  return <View style={styles.wrap}>{chips}</View>;
}
const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  scrollRow: { flexDirection: 'row', gap: 8, paddingBottom: 8, alignItems: 'center' },
  chip: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.chip, backgroundColor: colors.tealSoft, borderWidth: 1, borderColor: colors.tealSoft2, justifyContent: 'center' },
});
