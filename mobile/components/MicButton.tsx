import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { tr } from '../constants/strings';
import { colors } from '../constants/theme';
import type { Language } from '../types';
import { T } from './T';

/** Round mic button. While recording it turns red and pulses so it is obvious the phone is listening. */
export function MicButton({ phase, onPress, language }: { phase: 'idle' | 'recording' | 'transcribing'; onPress: () => void; language: Language }) {
  const t = tr(language);
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (phase !== 'recording') { pulse.setValue(0); return; }
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }));
    loop.start();
    return () => loop.stop();
  }, [phase, pulse]);
  const rec = phase === 'recording';
  return (
    <View style={styles.wrap}>
      {rec ? <Animated.View pointerEvents="none" style={[styles.ring, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }]} /> : null}
      <Pressable accessibilityRole="button" accessibilityLabel={rec ? t.stopRecording : phase === 'transcribing' ? t.transcribing : t.voice}
        accessibilityState={{ busy: phase === 'transcribing' }} disabled={phase === 'transcribing'} onPress={onPress}
        style={[styles.btn, rec && { backgroundColor: colors.danger }]}>
        <T variant="h3" color="#fff">{rec ? '■' : phase === 'transcribing' ? '…' : '🎤'}</T>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  btn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: colors.danger },
});
