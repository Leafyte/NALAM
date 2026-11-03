import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { tr } from '../constants/strings';
import { colors } from '../constants/theme';
import { useSession } from '../hooks/useSession';
import { T } from './T';

/** Slim, always-visible alert bar. Expands for details; one tap to call 112. Never says "you are safe". */
export function UrgentBanner() {
  const { urgent, language } = useSession();
  const [open, setOpen] = useState(false);
  if (!urgent) return null;
  const t = tr(language);
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.box}>
      <View style={styles.row}>
        <T variant="small" bold color={colors.danger} style={{ flexGrow: 1, flexShrink: 1, minWidth: 130 }}>⚠ {t.urgentTitle}</T>
        <Pressable accessibilityRole="button" accessibilityLabel={t.call112} onPress={() => Linking.openURL('tel:112')} style={styles.call}>
          <T variant="small" bold color="#fff">📞 {t.call112}</T>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={open ? t.hide : t.details} onPress={() => setOpen(!open)} style={styles.toggle} hitSlop={8}>
          <T variant="small" bold color={colors.danger}>{open ? t.hide : t.details}</T>
        </Pressable>
      </View>
      {open ? <T variant="small" color="#7F1D1D" style={{ marginTop: 8 }}>{urgent.message}</T> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  box: { backgroundColor: colors.dangerBg, borderBottomWidth: 1, borderColor: colors.dangerLine, paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  call: { backgroundColor: colors.danger, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  toggle: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
});
