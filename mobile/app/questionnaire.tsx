import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AnswerField } from '../components/AnswerField';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { FadeIn } from '../components/FadeIn';
import { FooterNote } from '../components/FooterNote';
import { ProgressSteps } from '../components/ProgressSteps';
import { Screen } from '../components/Screen';
import { ErrorView, LoadingView } from '../components/StateViews';
import { T } from '../components/T';
import { tr } from '../constants/strings';
import { colors } from '../constants/theme';
import { useAnswerDraft } from '../hooks/useAnswerDraft';
import { useIntake } from '../hooks/useIntake';
import { useSession } from '../hooks/useSession';

/**
 * Screen 2: Unified patient questionnaire.
 * Handles all applicable questions sequentially (core + triggered follow-ups)
 * with consistent progress, read-aloud, quick options, chips, and safe Back navigation.
 */
export default function Questionnaire() {
  const router = useRouter();
  const { language, services, sessionId } = useSession();
  const t = tr(language);
  const { state, loading, saving, error, saveError, editingId, setEditingId, save, refresh } = useIntake();

  const allItems = state ? state.items : [];
  const editingItem = editingId ? allItems.find((i) => i.question.id === editingId) : undefined;
  const question = editingItem ? editingItem.question : state?.next_question ?? null;
  const draft = useAnswerDraft(question, language, editingItem?.text ?? '', services);

  useEffect(() => {
    if (!sessionId) router.replace('/');
  }, [sessionId, router]);

  useEffect(() => {
    if (!state || editingId) return;
    // When all questions in the intake flow are answered, navigate to review
    if (!state.next_question) {
      router.replace('/review');
    }
  }, [state, editingId, router]);

  const answered = allItems.filter((i) => i.answered);

  function onBack() {
    if (editingId) {
      const idx = answered.findIndex((i) => i.question.id === editingId);
      if (idx > 0) {
        setEditingId(answered[idx - 1].question.id);
      } else {
        setEditingId(null);
      }
    } else if (answered.length > 0) {
      // Go back to the most recently answered question to inspect or edit
      setEditingId(answered[answered.length - 1].question.id);
    } else {
      // At the very beginning, return to welcome
      router.replace('/');
    }
  }

  if (loading) return <Screen><LoadingView language={language} /></Screen>;
  if (error || !state) return (
    <Screen onBack={() => router.replace('/')}>
      <ErrorView language={language} code={error?.code} message={error?.message} onRetry={refresh} />
    </Screen>
  );
  if (!question) return <Screen><LoadingView language={language} /></Screen>;

  const currentIdx = allItems.findIndex((i) => i.question.id === question.id) + 1;
  const totalQuestions = Math.max(allItems.length, 1);

  const footer = (
    <View>
      {saveError ? (
        <T variant="small" color={colors.danger} style={{ marginBottom: 8 }} accessibilityRole="alert">
          {saveError.code === 'network' ? t.serverProblem : saveError.message}
        </T>
      ) : null}
      <View style={styles.btnRow}>
        {!question.required ? (
          <Button
            variant="ghost"
            title={t.skipShort}
            accessibilityLabel={t.skip}
            disabled={saving}
            style={{ flex: 1 }}
            onPress={() => save(question.id, { text: '', input_mode: 'text', skipped: true })}
          />
        ) : null}
        <Button
          title={editingId ? t.save : t.continue}
          onPress={() => save(question.id, draft.payload())}
          disabled={!draft.canSend}
          loading={saving}
          style={{ flex: 2 }}
        />
      </View>
      <FooterNote />
    </View>
  );

  return (
    <Screen onBack={onBack} footer={footer}>
      {/* Dynamic Progress Indicator across all intake questions */}
      <ProgressSteps
        current={currentIdx}
        total={totalQuestions}
        label={t.stepOf(currentIdx, totalQuestions)}
      />

      {/* Answered Questions Navigation Chips */}
      {answered.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 12 }}
          contentContainerStyle={styles.chipRow}
        >
          {answered.map((i) => {
            const on = i.question.id === question.id;
            const shortLabel = t.short[i.question.id] || i.question.id;
            return (
              <Pressable
                key={i.question.id}
                accessibilityRole="button"
                accessibilityLabel={`${t.edit}: ${i.question.text}`}
                onPress={() => setEditingId(i.question.id)}
                style={[styles.doneChip, on && styles.doneChipOn]}
              >
                <T variant="caption" bold color={on ? '#fff' : colors.tealDark}>
                  {on ? '✎' : '✓'} {shortLabel}
                </T>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Active Question Card with Read-Aloud & Answer Field */}
      <FadeIn key={question.id}>
        <Card>
          <View style={styles.qRow}>
            <T variant="h2" accessibilityRole="header" style={{ flex: 1 }}>
              {question.text}
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.listen}
              onPress={draft.readAloud}
              style={styles.speaker}
              hitSlop={6}
            >
              <T variant="h3">🔊</T>
            </Pressable>
          </View>
        </Card>
        <AnswerField draft={draft} question={question} language={language} />
      </FadeIn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: 'row', gap: 10 },
  chipRow: { gap: 8, alignItems: 'center' },
  doneChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.tealSoft,
    justifyContent: 'center',
  },
  doneChipOn: { backgroundColor: colors.teal },
  qRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  speaker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
