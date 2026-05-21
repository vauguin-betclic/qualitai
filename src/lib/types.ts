export type AuthResponse = { login: string };

export const PERIODS = ['24h', '48h', '7d'] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_HOURS: Record<Period, number> = {
  '24h': 24,
  '48h': 48,
  '7d': 24 * 7
};

export const PERIOD_LABELS: Record<Period, string> = {
  '24h': 'last 24 hours',
  '48h': 'last 48 hours',
  '7d': 'last 7 days'
};

export type ScanResponse = {
  owner: string;
  repo: string;
  period: Period;
  sinceIso: string;
  prScanned: number;
  totalCopilot: number;
  withThumbdown: number;
};

export type ApiError = { error: string };
