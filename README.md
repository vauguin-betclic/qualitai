# QualitAI

Small backoffice to monitor the relevance of GitHub Copilot review comments on merged PRs.

## Prerequisites

- Node.js 20+ and npm
- GitHub CLI `gh` installed and authenticated locally (`gh auth login`)

The app uses your local `gh` CLI session — no token is ever stored or sent to the browser.

## Run

```sh
npm install
npm run dev
```

Then open http://localhost:5173.

1. Click **Connect** — the app reads your `gh` session and shows your GitHub login.
2. Paste a repo URL (`https://github.com/owner/repo` or `owner/repo`) and click **Scan**.
3. The scan lists PRs merged in the last 7 days, fetches inline review comments,
   and reports the total number of Copilot comments and how many got at least one 👎.

## Scope

This is a first skeleton. Only **PR review comments** (inline on diff) are scanned.
Copilot detection is permissive: any commenter whose `user.type === "Bot"` and whose
login matches `/copilot/i`.
