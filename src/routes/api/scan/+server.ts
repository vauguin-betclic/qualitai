import { json, error } from '@sveltejs/kit';
import { parseRepoUrl, runScan } from '$lib/server/scan';
import { GhError } from '$lib/server/gh';
import { PERIODS, type Period } from '$lib/types';
import type { RequestHandler } from './$types';

function isPeriod(value: unknown): value is Period {
  return typeof value === 'string' && (PERIODS as readonly string[]).includes(value);
}

export const POST: RequestHandler = async ({ request }) => {
  let body: { repoUrl?: unknown; period?: unknown };
  try {
    body = await request.json();
  } catch {
    throw error(400, 'Invalid JSON body');
  }

  const repoUrl = body.repoUrl;
  if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
    throw error(400, 'Missing repoUrl');
  }

  const period: Period = isPeriod(body.period) ? body.period : '7d';

  let ref;
  try {
    ref = parseRepoUrl(repoUrl);
  } catch (e) {
    throw error(400, e instanceof Error ? e.message : 'Invalid repository URL');
  }

  try {
    const result = await runScan(ref, period);
    return json(result);
  } catch (e) {
    const msg = e instanceof GhError ? e.message : e instanceof Error ? e.message : String(e);
    throw error(500, `Scan failed: ${msg}`);
  }
};
