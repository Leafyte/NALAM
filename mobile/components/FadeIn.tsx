import React, { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

/** Gentle fade + slide when a new question appears. Key it by question id. */
export function FadeIn({ children }: { children: React.ReactNode }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [v]);
  return <Animated.View style={{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>{children}</Animated.View>;
}
