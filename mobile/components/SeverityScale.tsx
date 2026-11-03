import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { tr } from '../constants/strings';
import { colors, radius, SEVERITY_COLORS, shadow } from '../constants/theme';
import type { Language } from '../types';
import { T } from './T';

export const severityLevel = (n: number) => (n === 0 ? 0 : n <= 3 ? 1 : n <= 6 ? 2 : n <= 8 ? 3 : 4);

interface Props {
  value: string;
  onChange: (v: string) => void;
  language: Language;
}

export function SeverityScale({ value, onChange, language }: Props) {
  const t = tr(language);
  const n = value === '' || isNaN(Number(value)) ? null : Math.max(0, Math.min(10, Math.round(Number(value))));

  const getSubLabel = (idx: number) => {
    switch (idx) {
      case 0: return t.sev[0];
      case 1:
      case 2:
      case 3: return t.sev[1];
      case 4:
      case 5:
      case 6: return t.sev[2];
      case 7:
      case 8: return t.sev[3];
      case 9:
      case 10: return t.sev[4];
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Prominent Current Score & Label Display */}
      <View style={styles.readoutCard}>
        {n === null ? (
          <View style={styles.emptyPrompt}>
            <T variant="body" bold color={colors.tealDark}>
              {t.severityLabel}
            </T>
            <T variant="caption" color={colors.muted} style={{ marginTop: 2 }}>
              Tap any number from 0 to 10 below
            </T>
          </View>
        ) : (
          <View style={styles.activeScoreRow}>
            <View style={[styles.scoreBadge, { backgroundColor: SEVERITY_COLORS[n] }]}>
              <T variant="h2" bold color="#FFFFFF">
                {n}
              </T>
              <T variant="caption" bold color="#FFFFFF" style={{ opacity: 0.9 }}>
                /10
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T variant="h3" bold color={SEVERITY_COLORS[n]}>
                {t.sev[severityLevel(n)]}
              </T>
              <T variant="caption" color={colors.muted}>
                {n === 0
                  ? 'No pain or discomfort'
                  : n <= 3
                  ? 'Mild discomfort — manageable'
                  : n <= 6
                  ? 'Moderate pain — noticeable & distracting'
                  : n <= 8
                  ? 'Severe pain — hard to ignore'
                  : 'Critical / Extreme pain'}
              </T>
            </View>
          </View>
        )}

        {/* Visual 11-Segment Spectrum Meter */}
        <View style={styles.spectrumBar}>
          {Array.from({ length: 11 }, (_, i) => {
            const isFilled = n !== null && i <= n;
            return (
              <View
                key={i}
                style={[
                  styles.spectrumSegment,
                  { backgroundColor: isFilled ? SEVERITY_COLORS[i] : '#E2E8F0' },
                  n === i && styles.spectrumSegmentActive,
                ]}
              />
            );
          })}
        </View>
      </View>

      {/* Row 1: Low to Moderate Discomfort (0 to 5) */}
      <View style={styles.rowWrapper}>
        <View style={styles.rowHeader}>
          <T variant="caption" bold color={colors.muted}>MILD TO MODERATE (0 - 5)</T>
        </View>
        <View style={styles.gridRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const isSelected = n === i;
            return (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityLabel={`Severity ${i}: ${getSubLabel(i)}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChange(String(i))}
                style={[
                  styles.button,
                  { borderColor: SEVERITY_COLORS[i] },
                  isSelected && {
                    backgroundColor: SEVERITY_COLORS[i],
                    borderColor: SEVERITY_COLORS[i],
                    transform: [{ scale: 1.05 }],
                  },
                ]}
              >
                <T
                  variant="h3"
                  bold
                  color={isSelected ? '#FFFFFF' : colors.text}
                  style={styles.buttonText}
                >
                  {i}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Row 2: Severe to Critical (6 to 10) */}
      <View style={styles.rowWrapper}>
        <View style={styles.rowHeader}>
          <T variant="caption" bold color={colors.danger}>SEVERE TO WORST (6 - 10)</T>
        </View>
        <View style={styles.gridRow}>
          {[6, 7, 8, 9, 10].map((i) => {
            const isSelected = n === i;
            return (
              <Pressable
                key={i}
                accessibilityRole="radio"
                accessibilityLabel={`Severity ${i}: ${getSubLabel(i)}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onChange(String(i))}
                style={[
                  styles.button,
                  styles.buttonRow2,
                  { borderColor: SEVERITY_COLORS[i] },
                  isSelected && {
                    backgroundColor: SEVERITY_COLORS[i],
                    borderColor: SEVERITY_COLORS[i],
                    transform: [{ scale: 1.05 }],
                  },
                ]}
              >
                <T
                  variant="h3"
                  bold
                  color={isSelected ? '#FFFFFF' : (i >= 9 ? colors.danger : colors.text)}
                  style={styles.buttonText}
                >
                  {i}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Spectrum Range Anchors */}
      <View style={styles.anchorsRow}>
        <T variant="caption" bold color={SEVERITY_COLORS[0]}>
          0 = {t.sev[0]}
        </T>
        <T variant="caption" color={colors.muted}>
          5 = {t.sev[2]}
        </T>
        <T variant="caption" bold color={SEVERITY_COLORS[10]}>
          10 = {t.sev[4]}
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  readoutCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: radius.card,
    padding: 14,
    marginBottom: 14,
    ...shadow,
  },
  emptyPrompt: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  activeScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    minWidth: 62,
    justifyContent: 'center',
  },
  spectrumBar: {
    flexDirection: 'row',
    gap: 3,
    height: 8,
    marginTop: 4,
  },
  spectrumSegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  spectrumSegmentActive: {
    height: 10,
    marginTop: -1,
  },
  rowWrapper: {
    marginBottom: 12,
  },
  rowHeader: {
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    height: 48,
    minWidth: 42,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  buttonRow2: {
    flex: 1,
    height: 48,
  },
  buttonText: {
    textAlign: 'center',
    includeFontPadding: false,
  },
  anchorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
});
