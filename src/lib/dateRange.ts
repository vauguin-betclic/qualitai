const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateOnly(s: string): Date | null {
  const m = s.match(DATE_ONLY_RE);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

export function exceedsThreeCalendarMonths(start: Date, end: Date): boolean {
  const cap = new Date(start);
  cap.setUTCMonth(cap.getUTCMonth() + 3);
  return end.getTime() > cap.getTime();
}

export type CustomRangeInput = { startDate: unknown; endDate: unknown };
export type CustomRangeResult =
  | { ok: true; startIso: string; endIso: string }
  | { ok: false; error: string };

export function validateCustomRange(input: CustomRangeInput): CustomRangeResult {
  const { startDate, endDate } = input;
  if (typeof startDate !== 'string' || !startDate.trim()) {
    return { ok: false, error: 'Start date is required' };
  }
  if (typeof endDate !== 'string' || !endDate.trim()) {
    return { ok: false, error: 'End date is required' };
  }
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start) return { ok: false, error: 'Start date must be YYYY-MM-DD' };
  if (!end) return { ok: false, error: 'End date must be YYYY-MM-DD' };
  if (start.getTime() > end.getTime()) {
    return { ok: false, error: 'Start date must be on or before end date' };
  }
  if (exceedsThreeCalendarMonths(start, end)) {
    return { ok: false, error: 'Custom range cannot exceed 3 months' };
  }
  return { ok: true, startIso: startDate, endIso: endDate };
}
