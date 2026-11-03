/** "7/10" or "7" -> 7. Returns null when the text is not a number (e.g. "Not provided."). */
export function parseSeverity(text: string): number | null {
  if (!text) return null;
  const m = /(?:^|\b)(10|[0-9])(?:\/10)?(?:\b|$)/.exec(text.trim());
  return m ? Number(m[1]) : null;
}
