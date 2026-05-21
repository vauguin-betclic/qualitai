import type { Octokit } from '@octokit/rest';
import { NO_DECORATION, PERIOD_HOURS, type Period, type ScanResponse } from '$lib/types';

export type RepoRef = { owner: string; repo: string };

export function parseRepoUrl(input: string): RepoRef {
  const raw = input.trim();
  if (!raw) throw new Error('Empty repository URL');

  // Accept: owner/repo, https://github.com/owner/repo(.git)?, git@github.com:owner/repo(.git)?
  const patterns: RegExp[] = [
    /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i,
    /^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i,
    /^([^/\s]+)\/([^/\s]+?)(?:\.git)?$/
  ];

  for (const re of patterns) {
    const m = raw.match(re);
    if (m) {
      const owner = m[1];
      const repo = m[2];
      if (isValidSegment(owner) && isValidSegment(repo)) return { owner, repo };
    }
  }
  throw new Error(`Invalid repository URL: ${input}`);
}

function isValidSegment(s: string): boolean {
  // GitHub login / repo names: letters, digits, dash, underscore, dot
  return /^[A-Za-z0-9._-]+$/.test(s) && s.length <= 100;
}

type ReviewComment = {
  id: number;
  user: { login: string; type: string } | null;
  body?: string | null;
  reactions?: Record<string, number> | null;
};

function isCopilotComment(c: ReviewComment): boolean {
  const u = c.user;
  if (!u) return false;
  if (u.type !== 'Bot') return false;
  return /copilot/i.test(u.login);
}

const CONVENTIONAL_RE = /^\s*\**\s*([a-zA-Z][a-zA-Z0-9_-]*)\s*(?:\(([^)]*)\))?\s*\**\s*:/;

export function extractDecorations(body: string): string[] {
  const firstLine = body.split(/\r?\n/).find((l) => l.trim().length > 0) ?? '';
  const m = firstLine.match(CONVENTIONAL_RE);
  if (!m) return [];
  const raw = m[2];
  if (!raw) return [];
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

function isoSeconds(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runScan(
  { owner, repo }: RepoRef,
  period: Period,
  octokit: Octokit
): Promise<ScanResponse> {
  const since = new Date(Date.now() - PERIOD_HOURS[period] * 3600 * 1000);
  const sinceIso = isoSeconds(since);

  const search = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:${owner}/${repo} is:pr is:merged merged:>=${sinceIso}`,
    per_page: 100,
    advanced_search: 'true'
  });
  const prs = search.data.items.map((i) => ({ number: i.number }));

  const commentsPerPr = await mapWithConcurrency(prs, 10, (pr) =>
    octokit.paginate(octokit.rest.pulls.listReviewComments, {
      owner,
      repo,
      pull_number: pr.number,
      per_page: 100
    }) as Promise<ReviewComment[]>
  );

  const all = commentsPerPr.flat();
  const copilot = all.filter(isCopilotComment);
  const withThumbdown = copilot.filter((c) => (c.reactions?.['-1'] ?? 0) > 0);

  const decorationStats: Record<string, { total: number; withThumbdown: number }> = {};
  const bump = (key: string, isBad: boolean) => {
    const slot = (decorationStats[key] ??= { total: 0, withThumbdown: 0 });
    slot.total += 1;
    if (isBad) slot.withThumbdown += 1;
  };
  for (const c of copilot) {
    const isBad = (c.reactions?.['-1'] ?? 0) > 0;
    const decos = extractDecorations(c.body ?? '');
    if (decos.length === 0) {
      bump(NO_DECORATION, isBad);
    } else {
      for (const d of decos) bump(d, isBad);
    }
  }

  return {
    owner,
    repo,
    period,
    sinceIso,
    prScanned: prs.length,
    totalCopilot: copilot.length,
    withThumbdown: withThumbdown.length,
    decorationStats
  };
}
