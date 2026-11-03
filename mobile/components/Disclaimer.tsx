import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tr } from '../constants/strings';
import { colors, radius } from '../constants/theme';
import { useSession } from '../hooks/useSession';
import { T } from './T';

export function Disclaimer() {
  const { language } = useSession();
  return <View style={styles.box}><T variant="small" color={colors.warnText}>ℹ️  {tr(language).notice}</T></View>;
}
const styles = StyleSheet.create({ box: { backgroundColor: colors.warnBg, borderRadius: radius.card, padding: 14, marginBottom: 12 } });
