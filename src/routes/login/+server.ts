import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import {
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE_S,
  buildAuthorizeUrl
} from '$lib/server/oauth';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies }) => {
  const state = crypto.randomUUID();
  cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: !dev,
    sameSite: 'lax',
    path: '/',
    maxAge: OAUTH_STATE_MAX_AGE_S
  });
  throw redirect(302, buildAuthorizeUrl(state));
};
