import React from 'react';
import { StyleSheet, View } from 'react-native';
import { tr } from '../constants/strings';
import { useAnswerDraft } from '../hooks/useAnswerDraft';
import type { AnswerPayload, Language, Question, ServicesStatus } from '../types';
import { AnswerField } from './AnswerField';
import { Button } from './Button';

/** Self-contained editor (field + buttons) used for inline editing in chat and review. */
export function AnswerInput({ question, language, initial = '', saving, services, onSubmit, onSkip, onCancel, submitLabel }: {
  question: Question; language: Language; initial?: string; saving: boolean; services: ServicesStatus | null;
  onSubmit: (a: AnswerPayload) => void; onSkip?: () => void; onCancel?: () => void; submitLabel?: string;
}) {
  const t = tr(language);
  const draft = useAnswerDraft(question, language, initial, services);
  return (
    <View>
      <AnswerField draft={draft} question={question} language={language} />
      <View style={styles.row}>
        {onCancel ? <Button variant="ghost" title={t.cancel} onPress={onCancel} disabled={saving} style={{ flex: 1 }} /> : null}
        {!question.required && onSkip ? <Button variant="ghost" title={t.skipShort} accessibilityLabel={t.skip} onPress={onSkip} disabled={saving} style={{ flex: 1 }} /> : null}
        <Button title={submitLabel ?? t.continue} onPress={() => onSubmit(draft.payload())} disabled={!draft.canSend} loading={saving} style={{ flex: 2 }} />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 10, marginTop: 12 } });
