import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { tr } from '../constants/strings';
import { colors } from '../constants/theme';
import type { Language } from '../types';
import { Button } from './Button';
import { T } from './T';

export function LoadingView({ language }: { language: Language }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <ActivityIndicator size="large" color={colors.teal} />
      <T variant="small" color={colors.muted} style={{ marginTop: 12 }}>{tr(language).loading}</T>
    </View>
  );
}

export function ErrorView({ language, code, message, onRetry }: { language: Language; code?: string; message?: string; onRetry: () => void }) {
  const t = tr(language);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <T variant="h1">📡</T>
      <T variant="body" color={colors.danger} style={{ textAlign: 'center', marginVertical: 12 }} accessibilityRole="alert">
        {code === 'network' ? t.serverProblem : message}
      </T>
      <Button title={t.retry} onPress={onRetry} />
    </View>
  );
}
