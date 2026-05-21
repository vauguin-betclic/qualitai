import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.session) {
    throw error(401, 'Not signed in');
  }
  return json({ login: locals.session.login });
};
