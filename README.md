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

No token is stored, no database, no telemetry — the app shells out to your local
`gh` CLI and renders the result in your browser.

## Prerequisites

- Node.js 20+ and npm
- [GitHub CLI](https://cli.github.com/) `gh` installed and authenticated locally:
  ```sh
  gh auth login
  ```

The token from `gh auth` stays on your machine. The browser only ever sees the
aggregated counts.

## Quick start

```sh
npm install
npm run dev
```

Then open <http://localhost:5173>.

1. Click **Connect** — the app reads your `gh` session and displays your GitHub login.
2. Pick a period: **24 hours**, **48 hours**, or **7 days**.
3. Paste a repository (`https://github.com/owner/repo`, `git@github.com:owner/repo.git`,
   or simply `owner/repo`) and click **Scan**.
4. Read the results.

## How it works

```
Browser  ──fetch──▶  SvelteKit server route  ──execFile──▶  gh CLI  ──HTTPS──▶  GitHub API
```

1. `GET /api/auth` runs `gh auth status` then `gh api user`, returning your login.
2. `POST /api/scan { repoUrl, period }`:
   1. Lists merged PRs in the period with
      `gh pr list --state merged --search "merged:>={ISO}"`.
   2. For each PR, fetches inline review comments via
      `gh api --paginate repos/{o}/{r}/pulls/{n}/comments`.
   3. Filters comments where `user.type === "Bot"` and the login matches `/copilot/i`.
   4. Counts thumbdowns from the `reactions["-1"]` field returned inline by the API.
   5. Parses the first line of each body against the Conventional Comments format
      to extract decorations.
   6. Returns aggregate counts — never the raw comment text.

## Project layout

```
src/
├── app.html
├── lib/
│   ├── types.ts             # shared types (ScanResponse, Period, …)
│   └── server/
│       ├── gh.ts            # execFile wrapper around the gh CLI
│       └── scan.ts          # URL parsing, PR listing, decoration parsing, aggregation
└── routes/
    ├── +layout.svelte
    ├── +page.svelte         # UI
    └── api/
        ├── auth/+server.ts  # GET → { login }
        └── scan/+server.ts  # POST → ScanResponse
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
