import { json, error } from '@sveltejs/kit';
import { ghText, ghJson, GhError } from '$lib/server/gh';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    await ghText(['auth', 'status']);
  } catch (e) {
    const msg = e instanceof GhError ? e.message : String(e);
    throw error(401, `Not authenticated with gh: ${msg}`);
  }

  try {
    const user = await ghJson<{ login: string }>(['api', 'user']);
    return json({ login: user.login });
  } catch (e) {
    const msg = e instanceof GhError ? e.message : String(e);
    throw error(500, `Failed to read GitHub user: ${msg}`);
  }
};
