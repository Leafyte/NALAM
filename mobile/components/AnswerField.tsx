import React from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { suggestionsFor } from '../constants/suggestions';
import { tr } from '../constants/strings';
import { colors, radius } from '../constants/theme';
import type { Draft } from '../hooks/useAnswerDraft';
import type { Language, Question } from '../types';
import { Chips } from './Chips';
import { MicButton } from './MicButton';
import { SeverityScale } from './SeverityScale';
import { T } from './T';

interface Props {
  draft: Draft;
  question: Question;
  language: Language;
  compact?: boolean;          // chat composer: slim input + send button on one row
  onSend?: () => void;        // compact only
  sending?: boolean;
  onSkip?: () => void;        // compact only (shown as a leading chip)
}

export function AnswerField({ draft, question, language, compact, onSend, sending, onSkip }: Props) {
  const t = tr(language);
  const sug = suggestionsFor(question.id, language);
  const notes = (
    <View>
      {draft.note ? <T variant="small" color={colors.muted} style={styles.note}>{draft.note}</T> : null}
      {draft.mode === 'voice' && draft.low ? <T variant="small" color={colors.warnText} style={styles.warn}>{t.lowConfidence}</T> : null}
      {draft.mode === 'voice' && draft.mock ? <T variant="small" color={colors.warnText} style={styles.warn}>{t.mockTranscript}</T> : null}
      {draft.preview ? <T variant="small" color={colors.muted} style={styles.note}>{t.translationPreview} {draft.preview}</T> : null}
    </View>
  );

  if (question.kind === 'severity') {
    return (
      <View>
        <SeverityScale value={draft.text} onChange={draft.setText} language={language} />
        {draft.sttOk ? (
          <View style={styles.voiceRow}>
            <MicButton phase={draft.phase} onPress={draft.toggleRecord} language={language} />
            <T variant="caption" color={colors.muted} style={{ flex: 1 }}>
              {draft.phase === 'recording'
                ? t.recording
                : draft.phase === 'transcribing'
                ? t.transcribing
                : 'Or tap mic to speak your rating (0 to 10)'}
            </T>
          </View>
        ) : null}
        {notes}
      </View>
    );
  }

  const input = (
    <TextInput
      accessibilityLabel={question.text}
      style={[styles.input, compact && styles.inputCompact]}
      multiline
      value={draft.text}
      onChangeText={draft.setText}
      placeholder={t.typeHere}
      placeholderTextColor="#94A3B8"
      maxLength={2000}
      editable={draft.phase === 'idle'}
    />
  );

  const chips = sug ? (
    <Chips scroll={compact} options={sug.options} onPress={(o) => draft.pick(o, sug.multi)}
      leading={compact && onSkip && !question.required ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.skip} onPress={onSkip} style={styles.skip}>
          <T variant="small" bold color={colors.muted}>{t.skipShort}</T>
        </Pressable>) : undefined} />
  ) : null;

  if (compact) {
    return (
      <View>
        {notes}
        {chips}
        <View style={styles.composer}>
          <View style={{ flex: 1 }}>{input}</View>
          {draft.sttOk ? <MicButton phase={draft.phase} onPress={draft.toggleRecord} language={language} /> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={t.send} accessibilityState={{ disabled: !draft.canSend || !!sending }}
            disabled={!draft.canSend || !!sending} onPress={onSend}
            style={[styles.send, (!draft.canSend || sending) && { backgroundColor: '#B8C4CE' }]}>
            <T variant="h3" color="#fff">➤</T>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      {question.hint ? <T variant="small" color={colors.muted} style={{ marginBottom: 10 }}>{question.hint}</T> : null}
      {sug ? <T variant="caption" color={colors.faint} style={{ marginBottom: 6 }}>{t.tapOrType}</T> : null}
      {chips}
      <View>
        {input}
        <View style={styles.micCorner}>
          {draft.sttOk ? <MicButton phase={draft.phase} onPress={draft.toggleRecord} language={language} />
            : null}
        </View>
      </View>
      {!draft.sttOk ? <T variant="caption" color={colors.faint} style={{ marginTop: 6 }}>{t.voiceUnavailable}</T> : null}
      {draft.phase === 'recording' ? <T variant="small" bold color={colors.danger} style={{ marginTop: 8 }}>{t.recording}</T> : null}
      {draft.phase === 'transcribing' ? <T variant="small" color={colors.muted} style={{ marginTop: 8 }}>{t.transcribing}</T> : null}
      {notes}
    </View>
  );
}

const styles = StyleSheet.create({
  input: { minHeight: 130, borderWidth: 1.5, borderColor: colors.line, borderRadius: radius.input, padding: 14, paddingRight: 64, fontSize: 18, lineHeight: 28, backgroundColor: '#fff', textAlignVertical: 'top', color: colors.text },
  inputCompact: { minHeight: 48, maxHeight: 120, paddingTop: 10, paddingBottom: 10, paddingRight: 14, fontSize: 17, lineHeight: 26 },
  micCorner: { position: 'absolute', right: 8, bottom: 8 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  skip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: colors.line, justifyContent: 'center', backgroundColor: '#fff' },
  note: { marginTop: 8 },
  warn: { marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: colors.warnBg },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: 4 },
});
