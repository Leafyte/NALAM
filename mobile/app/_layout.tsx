import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { colors } from '../constants/theme';
import { SessionProvider } from '../hooks/useSession';

export default function RootLayout() {
  return (
    <SessionProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false, contentStyle: { backgroundColor: colors.bg } }} />
    </SessionProvider>
  );
}
