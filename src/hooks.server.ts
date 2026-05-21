import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, unsealSession } from '$lib/server/session';

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.session = null;
  const raw = event.cookies.get(SESSION_COOKIE);
  if (raw) {
    try {
      event.locals.session = await unsealSession(raw);
    } catch {
      event.cookies.delete(SESSION_COOKIE, { path: '/' });
    }
  }
  return resolve(event);
};
