import React from 'react';
import { tr } from '../constants/strings';
import { colors } from '../constants/theme';
import { useSession } from '../hooks/useSession';
import { T } from './T';

/** One-line safety reminder that replaces the big disclaimer card on working screens. */
export function FooterNote() {
  const { language } = useSession();
  return <T variant="caption" color={colors.faint} style={{ textAlign: 'center', marginTop: 8 }}>{tr(language).footerNote}</T>;
}
