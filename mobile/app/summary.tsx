import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Accordion } from '../components/Accordion';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Disclaimer } from '../components/Disclaimer';
import { Screen } from '../components/Screen';
import { severityLevel } from '../components/SeverityScale';
import { T } from '../components/T';
import { tr } from '../constants/strings';
import { colors, radius, SEVERITY_COLORS, shadow } from '../constants/theme';
import { useSession } from '../hooks/useSession';
import { parseSeverity } from '../services/format';

/** Screen 5: structured summary. Screen 6 (clinician review) is the backend web page at /clinician. */
export default function SummaryScreen() {
  const router = useRouter();
  const { language, summary, reset } = useSession();
  const t = tr(language);
  useEffect(() => { if (!summary) router.replace('/'); }, [summary, router]);
  if (!summary) return null;

  const isEn = language === 'en';
  const resp = (id: string) => summary!.responses.find((r) => r.question_id === id);
  // Non-English patients see their OWN words here; the English version is in the clinician accordion below.
  const own = (id: string, fallback: string) => (isEn ? fallback : resp(id)?.current_text ?? resp(id)?.original_text ?? fallback);
  const sev = parseSeverity(summary.severity);
  const extraSymptoms = summary.reported_symptoms.filter((s) => !s.startsWith('Main concern:'));

  return (
    <Screen padded
      footer={<Button variant="ghost" title={t.startOver} onPress={() => { reset(); router.replace('/'); }} />}>
      <View style={styles.hero}>
        <View style={styles.tick}><T variant="h2" color="#fff">✓</T></View>
        <T variant="h2" color={colors.tealDark} accessibilityRole="header">{t.submittedTitle}</T>
        <T variant="small" color={colors.muted} style={{ textAlign: 'center', marginTop: 4 }}>{t.summaryDone}</T>
      </View>

      {summary.urgent_flags.length > 0 ? (
        <Card tone="danger" title={`⚠ ${t.possibleUrgent}`}>
          {summary.urgent_flags.map((f, i) => <T key={i} variant="body" bold color={colors.danger}>• {t.flag[f.label] ?? f.label}</T>)}
        </Card>
      ) : null}

      <Card title={t.atAGlance}>
        <T variant="caption" bold color={colors.muted}>{t.mainConcern.toUpperCase()}</T>
        <T variant="h3" style={{ marginBottom: 12 }}>{own('chief_complaint', summary.main_concern)}</T>
        <View style={styles.grid}>
          <View style={styles.cell}><T variant="caption" bold color={colors.muted}>{t.onset.toUpperCase()}</T><T variant="body">{own('onset', summary.onset)}</T></View>
          <View style={styles.cell}><T variant="caption" bold color={colors.muted}>{t.duration.toUpperCase()}</T><T variant="body">{own('duration', summary.duration)}</T></View>
        </View>
        <View style={{ marginTop: 12 }}>
          <T variant="caption" bold color={colors.muted}>{t.severity.toUpperCase()}</T>
          {sev === null ? <T variant="body">{summary.severity}</T> : (
            <View>
              <T variant="body" bold color={SEVERITY_COLORS[sev]}>{sev}/10 · {t.sev[severityLevel(sev)]}</T>
              <View style={styles.meter}>
                {Array.from({ length: 11 }, (_, i) => <View key={i} style={[styles.seg, { backgroundColor: i <= sev ? SEVERITY_COLORS[i] : '#E2E8F0' }]} />)}
              </View>
            </View>
          )}
        </View>
      </Card>

      {isEn && extraSymptoms.length > 0 ? (
        <Card title={t.symptoms}>{extraSymptoms.map((s, i) => <T key={i} variant="body" style={{ marginBottom: 4 }}>• {s}</T>)}</Card>
      ) : null}
      <Card title={t.extra}><T variant="body">{own('additional_info', summary.additional_info)}</T></Card>

      {summary.negated_mentions.length > 0 ? (
        <Card title={t.mentionedNegated}>{summary.negated_mentions.map((f, i) => <T key={i} variant="body">• {t.flag[f.label] ?? f.label}</T>)}</Card>
      ) : null}

      {!isEn ? (
        <Accordion title={t.clinicianEnglish}>
          {([[t.mainConcern, summary.main_concern], [t.onset, summary.onset], [t.duration, summary.duration],
            [t.severity, summary.severity], [t.extra, summary.additional_info]] as [string, string][]).map(([k, v]) => (
            <View key={k} style={{ marginBottom: 8 }}>
              <T variant="caption" bold color={colors.muted}>{k}</T>
              <T variant="body">{v}</T>
            </View>
          ))}
          {summary.reported_symptoms.map((s, i) => <T key={i} variant="small" color={colors.muted}>• {s}</T>)}
        </Accordion>
      ) : null}
      <Accordion title={t.showResponses}>
        {summary.responses.map((r) => (
          <View key={r.question_id} style={{ marginBottom: 12 }}>
            <T variant="caption" bold color={colors.muted}>{r.question}</T>
            <T variant="body">{r.skipped ? 'Not provided.' : r.original_text}</T>
            {r.translated_text ? <T variant="small" color={colors.muted}>{t.translated}: {r.translated_text}</T> : null}
            {r.edited && r.current_text !== r.original_text ? <Text style={{ color: colors.muted, fontSize: 13 }}>({t.edited}: {r.current_text})</Text> : null}
          </View>
        ))}
      </Accordion>
      <Accordion title={t.showNotes}>
        {summary.uncertainty_notes.length ? summary.uncertainty_notes.map((n, i) => <T key={i} variant="small" color={colors.muted} style={{ marginBottom: 4 }}>• {n}</T>)
          : <T variant="small" color={colors.muted}>{t.noneRecorded}</T>}
      </Accordion>

      <Disclaimer />
      <T variant="caption" color={colors.faint}>{summary.notice}</T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: 16, marginBottom: 8 },
  tick: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', marginBottom: 10, ...shadow },
  grid: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1, backgroundColor: colors.bg, borderRadius: radius.input, padding: 12 },
  meter: { flexDirection: 'row', gap: 3, marginTop: 8 },
  seg: { flex: 1, height: 8, borderRadius: 4 },
});
