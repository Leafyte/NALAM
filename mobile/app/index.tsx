import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Disclaimer } from '../components/Disclaimer';
import { FooterNote } from '../components/FooterNote';
import { Screen } from '../components/Screen';
import { T } from '../components/T';
import { LANGUAGE_LIST } from '../constants/languages';
import { strings, tr } from '../constants/strings';
import { colors, MIN_TOUCH, radius, shadow } from '../constants/theme';
import { useSession } from '../hooks/useSession';
import { BASE_URL, errorMessage } from '../services/api';
import type { Language } from '../types';

export default function Welcome() {
  const router = useRouter();
  const { language, setLanguage, begin, refreshServices } = useSession();
  const t = tr(language);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onStart() {
    setBusy(true); setError(null);
    try { await begin(); router.replace('/questionnaire'); }
    catch (e) {
      const { code, message } = errorMessage(e);
      setError(code === 'network' ? t.serverProblem : message);
      refreshServices();
    } finally { setBusy(false); }
  }

  const LangCard = ({ l, label, sub }: { l: Language; label: string; sub: string }) => {
    const on = language === l;
    return (
      <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => setLanguage(l)}
        style={[styles.lang, shadow, on && styles.langOn]}>
        <T variant="h2" color={on ? colors.tealDark : colors.text}>{label}</T>
        <T variant="small" color={colors.muted} style={{ marginTop: 2 }}>{sub}</T>
        {on ? <View style={styles.check}><T variant="caption" bold color="#fff">✓</T></View> : null}
      </Pressable>
    );
  };

  const Step = ({ n, text }: { n: number; text: string }) => (
    <View style={styles.step}>
      <View style={styles.stepNum}><T variant="small" bold color="#fff">{n}</T></View>
      <T variant="body" style={{ flex: 1 }}>{text}</T>
    </View>
  );

  return (
    <Screen bar={false} padded={false}
      footer={
        <View>
          <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: agreed }} accessibilityLabel={t.consentCheck}
            onPress={() => setAgreed(!agreed)} style={styles.checkRow}>
            <View style={[styles.box, agreed && styles.boxOn]}>{agreed ? <T variant="small" bold color="#fff">✓</T> : null}</View>
            <T variant="body" bold style={{ flex: 1 }}>{t.consentCheck}</T>
          </Pressable>
          {error ? <T variant="small" color={colors.danger} accessibilityRole="alert" style={{ marginBottom: 8 }}>{error}</T> : null}
          <Button title={error ? t.retry : t.start} onPress={onStart} disabled={!agreed} loading={busy} />
          <FooterNote />
        </View>
      }>
      <View style={styles.hero}>
        <View style={styles.logo}><T variant="h1">🩺</T></View>
        <T variant="h1" color={colors.tealDark} style={{ textAlign: 'center' }}>{t.appName}</T>
        <T variant="body" color={colors.muted} style={{ textAlign: 'center', marginTop: 6 }}>{t.tagline}</T>
      </View>

      <View style={styles.body}>
        <T variant="small" bold color={colors.muted} style={styles.label}>{t.chooseLanguage}</T>
        <View style={styles.langRow}>
          {LANGUAGE_LIST.map((l) => <LangCard key={l.code} l={l.code} label={l.native} sub={strings[l.code].continueIn} />)}
        </View>
        {LANGUAGE_LIST.find((l) => l.code === language)?.draft ? (
          <T variant="caption" color={colors.warnText} style={styles.draft}>ℹ️ {t.draftNotice}</T>
        ) : null}

        <Card title={t.howTitle}>
          <Step n={1} text={t.how1} />
          <Step n={2} text={t.how2} />
          <Step n={3} text={t.how3} />
        </Card>

        <Card title={t.consentTitle}>
          <T variant="small" color={colors.muted}>{t.consentText}</T>
        </Card>

        <Disclaimer />
        <T variant="caption" color="#A0AAB4" style={{ textAlign: 'center' }}>Server: {BASE_URL}</T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.tealSoft, alignItems: 'center', paddingTop: 36, paddingBottom: 28, paddingHorizontal: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  logo: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 14, ...shadow },
  body: { padding: 16 },
  label: { marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.6 },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  draft: { backgroundColor: colors.warnBg, borderRadius: 12, padding: 10, marginBottom: 14 },
  lang: { width: '47.5%', flexGrow: 1, minHeight: 84, borderRadius: radius.card, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#fff', padding: 14, justifyContent: 'center' },
  langOn: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH, marginBottom: 2 },
  box: { width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: colors.teal, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  boxOn: { backgroundColor: colors.teal },
});
