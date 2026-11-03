import React from 'react';
import { Text, TextProps } from 'react-native';
import { colors, font } from '../constants/theme';
import { useSession } from '../hooks/useSession';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption';
const WEIGHT: Record<Variant, '400' | '600' | '700' | '800'> = { h1: '800', h2: '700', h3: '700', body: '400', small: '400', caption: '400' };

/** Text with a type scale. Indic scripts (Kannada, Devanagari, Tamil) have taller glyphs, so it gets more line height (avoids clipping). */
export function T({ variant = 'body', color, bold, style, ...rest }: TextProps & { variant?: Variant; color?: string; bold?: boolean }) {
  const { language } = useSession();
  // Indic scripts are visually smaller, so small text gets +1pt.
  const size = font[variant] + (language !== 'en' && (variant === 'small' || variant === 'caption') ? 1 : 0);
  return (
    <Text {...rest}
      style={[{ fontSize: size, lineHeight: Math.round(size * (language !== 'en' ? 1.65 : 1.42)), color: color ?? colors.text,
        fontWeight: bold ? '700' : WEIGHT[variant] }, style]} />
  );
}
