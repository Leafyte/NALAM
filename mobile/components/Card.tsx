import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, shadow } from '../constants/theme';
import { T } from './T';

export function Card({ title, children, tone }: { title?: string; children: React.ReactNode; tone?: 'danger' }) {
  return (
    <View style={[styles.card, shadow, tone === 'danger' && styles.danger]}>
      {title ? <T variant="small" bold color={tone === 'danger' ? colors.danger : colors.tealDark} accessibilityRole="header" style={styles.title}>{title}</T> : null}
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, padding: 16, marginBottom: 12 },
  danger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.dangerLine },
  title: { marginBottom: 6, letterSpacing: 0.2 },
});
