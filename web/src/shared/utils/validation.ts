export function parseMonth(input: string): number | null {
  const numeric = Number(input);
  if (!Number.isInteger(numeric) || numeric < 1 || numeric > 12) {
    return null;
  }
  return numeric;
}
