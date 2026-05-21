import { Octokit } from '@octokit/rest';

export function octokitFor(accessToken: string): Octokit {
  return new Octokit({ auth: accessToken, userAgent: 'qualitai' });
}

export async function getAuthenticatedLogin(octokit: Octokit): Promise<string> {
  const { data } = await octokit.rest.users.getAuthenticated();
  return data.login;
}
