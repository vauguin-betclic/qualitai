import { error, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { OAUTH_STATE_COOKIE, OAuthError, exchangeCodeForToken } from '$lib/server/oauth';
import { SESSION_COOKIE, SESSION_MAX_AGE_S, sealSession } from '$lib/server/session';
import { getAuthenticatedLogin, octokitFor } from '$lib/server/github';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const expectedState = cookies.get(OAUTH_STATE_COOKIE);
  cookies.delete(OAUTH_STATE_COOKIE, { path: '/' });

  if (!code || !state || !expectedState || state !== expectedState) {
    throw error(400, 'Invalid OAuth state');
  }

  let accessToken: string;
  try {
    accessToken = await exchangeCodeForToken(code);
  } catch (e) {
    const msg = e instanceof OAuthError ? e.message : 'OAuth exchange failed';
    throw error(502, msg);
  }

  let login: string;
  try {
    login = await getAuthenticatedLogin(octokitFor(accessToken));
  } catch {
    throw error(502, 'Failed to fetch GitHub user');
  }

  const sealed = await sealSession({ accessToken, login });
  cookies.set(SESSION_COOKIE, sealed, {
    httpOnly: true,
    secure: !dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_S
  });

  throw redirect(302, '/');
};
