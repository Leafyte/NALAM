import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AnswerInput } from '../components/AnswerInput';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FooterNote } from '../components/FooterNote';
import { Screen } from '../components/Screen';
import { ErrorView, LoadingView } from '../components/StateViews';
import { T } from '../components/T';
import { tr } from '../constants/strings';
import { colors, MIN_TOUCH } from '../constants/theme';
import { useIntake } from '../hooks/useIntake';
import { useSession } from '../hooks/useSession';
import { api, errorMessage } from '../services/api';

/** Screen 4: review, edit any answer, confirm accuracy, submit. */
export default function Review() {
  const router = useRouter();
  const { language, services, sessionId, setSummary } = useSession();
  const t = tr(language);
  const { state, loading, saving, error, saveError, editingId, setEditingId, save, refresh } = useIntake();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => { if (!sessionId) router.replace('/'); }, [sessionId, router]);

  if (loading) return <Screen><LoadingView language={language} /></Screen>;
  if (error || !state) return <Screen onBack={() => router.replace('/questionnaire')}><ErrorView language={language} code={error?.code} message={error?.message} onRetry={refresh} /></Screen>;

  const incomplete = state.next_question;

  async function onSubmit() {
    if (!sessionId) return;
    setSubmitting(true); setSubmitError(null);
    try { setSummary(await api.submit(sessionId)); router.replace('/summary'); }
    catch (e) { const { code, message } = errorMessage(e); setSubmitError(code === 'network' ? t.serverProblem : message); }
    finally { setSubmitting(false); }
  }

  const footer = incomplete ? (
    <View>
      <Button title={t.answerThem} onPress={() => router.replace('/questionnaire')} />
      <FooterNote />
    </View>
  ) : (
    <View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: confirmed }} accessibilityLabel={t.confirm}
        onPress={() => setConfirmed(!confirmed)} style={styles.checkRow}>
        <View style={[styles.box, confirmed && styles.boxOn]}>{confirmed ? <T variant="small" bold color="#fff">✓</T> : null}</View>
        <T variant="small" bold style={{ flex: 1 }}>{t.confirm}</T>
      </Pressable>
      {saveError ? <T variant="small" color={colors.danger} accessibilityRole="alert">{saveError.code === 'network' ? t.serverProblem : saveError.message}</T> : null}
      {submitError ? <T variant="small" color={colors.danger} accessibilityRole="alert">{submitError}</T> : null}
      <Button title={submitting ? t.submitting : t.submit} onPress={onSubmit} disabled={!confirmed || !!editingId} loading={submitting} />
      <FooterNote />
    </View>
  );

  return (
    <Screen heading={t.reviewTitle} footer={footer} onBack={() => router.replace('/questionnaire')}>
      <T variant="body" color={colors.muted} style={{ marginBottom: 12 }}>{t.reviewIntro}</T>
      {incomplete ? <Card tone="danger"><T variant="small" color={colors.danger}>{t.unfinished}</T></Card> : null}
      <Card>
        {state.items.filter((i) => i.answered).map((i, idx) => (
          <View key={i.question.id} style={[styles.row, idx > 0 && styles.divider]}>
            {editingId === i.question.id ? (
              <AnswerInput question={i.question} language={language} initial={i.text ?? ''} saving={saving} services={services}
                onSubmit={(a) => save(i.question.id, a)} onCancel={() => setEditingId(null)} submitLabel={t.save}
                onSkip={() => save(i.question.id, { text: '', input_mode: 'text', skipped: true })} />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <T variant="caption" bold color={colors.tealDark} style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>{t.short[i.question.id]}</T>
                  <T variant="body" style={{ marginTop: 2 }}>{i.skipped ? t.skipped : i.question.kind === 'severity' ? `${i.text}/10` : i.text}</T>
                  {i.translated_text && !i.skipped ? <T variant="small" color={colors.muted} style={{ marginTop: 4 }}>{t.translated}: {i.translated_text}</T> : null}
                  {i.edited && i.original_text ? <T variant="small" color={colors.muted} style={{ marginTop: 4 }}>{t.original}: {i.original_text}</T> : null}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${t.edit}: ${i.question.text}`} onPress={() => setEditingId(i.question.id)} style={styles.edit}>
                  <T variant="small" bold color={colors.tealDark}>✎ {t.edit}</T>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 12 },
  divider: { borderTopWidth: 1, borderColor: colors.line },
  edit: { minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.tealSoft, justifyContent: 'center' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: MIN_TOUCH, marginBottom: 4 },
  box: { width: 30, height: 30, borderRadius: 9, borderWidth: 2, borderColor: colors.teal, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  boxOn: { backgroundColor: colors.teal },
});
