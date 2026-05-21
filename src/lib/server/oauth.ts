import {
  BASE_URL,
  GITHUB_OAUTH_CLIENT_ID,
  GITHUB_OAUTH_CLIENT_SECRET
} from '$env/static/private';

const SCOPES = 'repo read:user';

export const OAUTH_STATE_COOKIE = 'oauth_state';
export const OAUTH_STATE_MAX_AGE_S = 60 * 5;

function redirectUri(): string {
  return `${BASE_URL.replace(/\/$/, '')}/login/callback`;
}

export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export class OAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthError';
  }
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: GITHUB_OAUTH_CLIENT_ID,
      client_secret: GITHUB_OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri()
    })
  });
  if (!res.ok) {
    throw new OAuthError(`Token exchange failed: HTTP ${res.status}`);
  }
  const data = (await res.json()) as
    | { access_token: string; token_type?: string; scope?: string }
    | { error: string; error_description?: string };
  if ('error' in data) {
    throw new OAuthError(data.error_description ?? data.error);
  }
  if (!data.access_token) {
    throw new OAuthError('Token exchange returned no access_token');
  }
  return data.access_token;
}
