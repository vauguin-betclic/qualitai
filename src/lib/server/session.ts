import { Buffer } from 'node:buffer';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { SESSION_SECRET } from '$env/static/private';

export type Session = { accessToken: string; login: string };

function loadKey(): Uint8Array {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET is not set');
  }
  const bytes = Uint8Array.from(Buffer.from(SESSION_SECRET, 'base64'));
  if (bytes.byteLength < 32) {
    throw new Error(`SESSION_SECRET must decode to ≥32 bytes (got ${bytes.byteLength})`);
  }
  return bytes.byteLength === 32 ? bytes : bytes.slice(0, 32);
}

let cachedKey: Uint8Array | null = null;
function key(): Uint8Array {
  return (cachedKey ??= loadKey());
}

export async function sealSession(session: Session): Promise<string> {
  return new EncryptJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .encrypt(key());
}

export async function unsealSession(jwe: string): Promise<Session> {
  const { payload } = await jwtDecrypt(jwe, key());
  const accessToken = payload.accessToken;
  const login = payload.login;
  if (typeof accessToken !== 'string' || typeof login !== 'string') {
    throw new Error('Invalid session payload');
  }
  return { accessToken, login };
}

export const SESSION_COOKIE = 'session';
export const SESSION_MAX_AGE_S = 60 * 60 * 24 * 30;
