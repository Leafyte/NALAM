import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, MIN_TOUCH, radius } from '../constants/theme';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, accessibilityLabel, style }: Props) {
  const off = disabled || loading;
  const light = variant === 'primary' || variant === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.base, styles[variant], disabled && !loading && (light ? styles.offFilled : styles.offLight),
        pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }, style]}
    >
      {loading ? <ActivityIndicator color={light ? '#fff' : colors.teal} />
        : <Text style={[styles.text, { color: light ? '#fff' : colors.tealDark }, disabled && !light && { color: colors.faint }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: MIN_TOUCH, borderRadius: radius.button, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.teal },
  secondary: { backgroundColor: colors.tealSoft },
  ghost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line },
  danger: { backgroundColor: colors.danger },
  offFilled: { backgroundColor: '#B8C4CE' },
  offLight: { opacity: 0.6 },
  text: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
});
