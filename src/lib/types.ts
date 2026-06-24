export type AuthResponse = { login: string };

export const PERIODS = ['24h', '48h', '7d', 'custom'] as const;
export type Period = (typeof PERIODS)[number];
export type PresetPeriod = Exclude<Period, 'custom'>;

export const PERIOD_HOURS: Record<PresetPeriod, number> = {
  '24h': 24,
  '48h': 48,
  '7d': 24 * 7
};

export const PERIOD_LABELS: Record<Period, string> = {
  '24h': 'last 24 hours',
  '48h': 'last 48 hours',
  '7d': 'last 7 days',
  custom: 'custom range'
};

export const NO_DECORATION = '(no decoration)';

export type DecorationStats = { total: number; withThumbdown: number };

export type ScanResponse = {
  owner: string;
  repo: string;
  period: Period;
  sinceIso: string;
  untilIso?: string;
  prScanned: number;
  totalCopilot: number;
  withThumbdown: number;
  decorationStats: Record<string, DecorationStats>;
};

export type ApiError = { error: string };
