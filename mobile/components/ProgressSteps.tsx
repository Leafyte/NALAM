import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../constants/theme';
import { T } from './T';

/** Segmented progress: completed = solid, current = bright, rest = grey. `total` is stable per stage. */
export function ProgressSteps({ current, total, label }: { current: number; total: number; label: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: total, now: current }} style={{ marginBottom: 14 }}>
      <T variant="small" color={colors.muted} style={{ marginBottom: 6 }}>{label}</T>
      <View style={styles.row}>
        {Array.from({ length: Math.max(total, 1) }, (_, i) => (
          <View key={i} style={[styles.seg, i < current - 1 ? styles.done : i === current - 1 ? styles.now : null]} />
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0' },
  done: { backgroundColor: colors.teal },
  now: { backgroundColor: colors.tealMid },
});
