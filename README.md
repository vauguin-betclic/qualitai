# QualitAI

Small backoffice to monitor the relevance of [GitHub Copilot](https://github.com/features/copilot)
review comments on merged pull requests.

For each scan, QualitAI tells you:

- How many PRs were merged in the chosen period
- How many inline review comments Copilot left on those PRs
- How many of those comments received at least one 👎 reaction
- The resulting **bad-comment ratio**
- A breakdown by [Conventional Comments](https://conventionalcomments.org/) **decoration**
  (`non-blocking`, `blocking`, `if-minor`, …) with the same `total / 👎 / ratio` per bucket

Users sign in with their own GitHub account via OAuth. The access token is stored
encrypted in an HttpOnly cookie — never exposed to the browser JavaScript.

## Prerequisites

- Node.js 20+ and npm
- A **GitHub OAuth App** (one for dev, one for prod recommended)

### Register the OAuth App

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**.
2. Fill the form:
   - **Application name**: QualitAI (or anything you like)
   - **Homepage URL**: `http://localhost:5173` (dev) or your prod URL
   - **Authorization callback URL**: `${BASE_URL}/login/callback`
3. Generate a client secret and keep both `Client ID` and `Client Secret` at hand.

### Environment variables

Copy `.env.example` to `.env` and fill in:

```sh
cp .env.example .env
```

| Variable                     | What                                                     |
| ---------------------------- | -------------------------------------------------------- |
| `GITHUB_OAUTH_CLIENT_ID`     | Client ID of your OAuth App                              |
| `GITHUB_OAUTH_CLIENT_SECRET` | Client secret of your OAuth App                          |
| `SESSION_SECRET`             | 32-byte random key, base64-encoded                       |
| `BASE_URL`            | Public origin of the app (used to build the callback URL)|

Generate a session secret with:

```sh
openssl rand -base64 32
```

## Quick start

```sh
npm install
npm run dev
```

Then open <http://localhost:5173>.

1. Click **Sign in with GitHub** — you'll be redirected to GitHub, asked to authorize
   the app (scopes: `repo`, `read:user`), and bounced back.
2. Pick a period: **24 hours**, **48 hours**, or **7 days**.
3. Paste a repository (`https://github.com/owner/repo`, `git@github.com:owner/repo.git`,
   or simply `owner/repo`) and click **Scan**.
4. Read the results.

## How it works

```
Browser ──fetch──▶ SvelteKit server route ──@octokit/rest──▶ GitHub REST API
   ▲                       │
   └── encrypted session ──┘
       cookie (JWE)
```

1. `GET /login` → generates a CSRF state, redirects to `github.com/login/oauth/authorize`.
2. `GET /login/callback` → verifies state, exchanges `code` for an access token,
   stores `{ accessToken, login }` in a JWE-encrypted cookie (AES-256-GCM via `jose`).
3. `src/hooks.server.ts` reads the cookie on every request and attaches the session
   to `event.locals`.
4. `POST /api/scan { repoUrl, period }`:
   1. Resolves the merged PRs over the period via
      `octokit.rest.search.issuesAndPullRequests({ q: "is:pr is:merged merged:>=…" })`.
   2. For each PR, paginates `octokit.rest.pulls.listReviewComments` (10 PRs in parallel).
   3. Filters comments where `user.type === "Bot"` and the login matches `/copilot/i`.
   4. Parses the first line of each body against the Conventional Comments format to
      extract decorations.
   5. Aggregates totals, thumbdowns, ratios, and decoration buckets.
5. `POST /logout` → clears the session cookie.

## Project layout

```
src/
├── app.html
├── app.d.ts
├── hooks.server.ts            # reads session cookie, populates event.locals.session
├── lib/
│   ├── types.ts               # shared types (ScanResponse, Period, decorations…)
│   └── server/
│       ├── github.ts          # Octokit factory + getAuthenticatedLogin
│       ├── oauth.ts           # authorize URL + code-for-token exchange
│       ├── session.ts         # JWE seal/unseal (jose)
│       └── scan.ts            # URL parsing, scan logic, decoration parsing
└── routes/
    ├── +layout.svelte
    ├── +page.svelte           # UI (signed-in or signed-out)
    ├── +page.server.ts        # load → { user: locals.session?.login ?? null }
    ├── api/
    │   ├── auth/+server.ts    # GET → { login } | 401
    │   └── scan/+server.ts    # POST → ScanResponse | 401/400/500
    ├── login/
    │   ├── +server.ts         # GET → redirect to GitHub authorize
    │   └── callback/+server.ts# GET → exchange code, set session, redirect /
    └── logout/+server.ts      # POST → clear session, redirect /
```

## Scope and limitations

- Only **inline PR review comments** are scanned. Issue comments and review summaries
  are not (yet) counted.
- Copilot detection is intentionally permissive: any commenter with
  `user.type === "Bot"` and a login matching `/copilot/i` is counted as Copilot.
- Decoration parsing tolerates the common markdown wrappers
  (`**label (deco):**`, `label (deco):`) and normalises decorations to lowercase.
  A comment that does not follow Conventional Comments falls into a single
  `(no decoration)` bucket.
- Multi-decoration comments (`suggestion (non-blocking, if-minor): …`) count once
  in every bucket they declare — the sum of per-bucket totals can therefore exceed
  the total number of Copilot comments.

## Scripts

| Command           | What it does                                |
| ----------------- | ------------------------------------------- |
| `npm run dev`     | Start the dev server on port 5173           |
| `npm run build`   | Build the production bundle                 |
| `npm run preview` | Preview the production build locally        |
| `npm run check`   | `svelte-kit sync` + `svelte-check` (typecheck) |

## License

MIT.
