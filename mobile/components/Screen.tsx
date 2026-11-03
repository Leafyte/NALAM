import React, { useRef } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LANGUAGES } from '../constants/languages';
import { tr } from '../constants/strings';
import { colors } from '../constants/theme';
import { useSession } from '../hooks/useSession';
import { T } from './T';
import { UrgentBanner } from './UrgentBanner';

interface Props {
  children: React.ReactNode;
  heading?: string;
  onBack?: () => void;
  footer?: React.ReactNode;       // pinned to the bottom (primary actions)
  bar?: boolean;                  // top bar (default true)
  padded?: boolean;
  stickToBottom?: boolean;        // chat: keep newest message in view
}

export function Screen({ children, heading, onBack, footer, bar = true, padded = true, stickToBottom }: Props) {
  const { language } = useSession();
  const t = tr(language);
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {bar ? (
        <View style={styles.bar}>
          {onBack ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t.back} onPress={onBack} style={styles.back} hitSlop={6}>
              <T variant="h2" color={colors.tealDark}>‹</T>
            </Pressable>
          ) : <View style={styles.back} />}
          <T variant="body" bold color={colors.tealDark} style={{ flex: 1, textAlign: 'center' }}>🩺 {t.appName}</T>
          <View style={styles.pill}><T variant="caption" bold color={colors.tealDark}>{language === 'en' ? 'EN' : LANGUAGES[language].native}</T></View>
        </View>
      ) : null}
      <UrgentBanner />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={ref} contentContainerStyle={[padded && styles.scroll, !padded && { paddingBottom: 24 }]}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          onContentSizeChange={() => { if (stickToBottom) ref.current?.scrollToEnd({ animated: true }); }}>
          {heading ? <T variant="h1" color={colors.tealDark} accessibilityRole="header" style={{ marginBottom: 12 }}>{heading}</T> : null}
          {children}
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, minHeight: 52, backgroundColor: colors.card, borderBottomWidth: 1, borderColor: colors.line },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pill: { minWidth: 44, height: 28, borderRadius: 14, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginRight: 4 },
  scroll: { padding: 16, paddingBottom: 28 },
  footer: { backgroundColor: colors.card, borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 },
});
