import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { T } from './T';

export function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.box, shadow]}>
      <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={styles.head}>
        <T variant="small" bold color={colors.tealDark} style={{ flex: 1 }}>{title}</T>
        <T variant="h3" color={colors.tealDark}>{open ? '−' : '+'}</T>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderRadius: radius.card, marginBottom: 12, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', padding: 16, minHeight: 56 },
  body: { paddingHorizontal: 16, paddingBottom: 16 },
});
