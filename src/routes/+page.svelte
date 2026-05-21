<script lang="ts">
  import {
    NO_DECORATION,
    PERIODS,
    PERIOD_LABELS,
    type DecorationStats,
    type Period,
    type ScanResponse
  } from '$lib/types';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  function sortedDecorations(
    stats: Record<string, DecorationStats>
  ): Array<[string, DecorationStats]> {
    return Object.entries(stats).sort(([a, sa], [b, sb]) => {
      const aNo = a === NO_DECORATION;
      const bNo = b === NO_DECORATION;
      if (aNo !== bNo) return aNo ? 1 : -1;
      if (sb.total !== sa.total) return sb.total - sa.total;
      return a.localeCompare(b);
    });
  }

  function ratioPct(num: number, denom: number): string {
    if (denom === 0) return '—';
    return `${((num / denom) * 100).toFixed(1)}%`;
  }

  type ScanState =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'success'; result: ScanResponse }
    | { kind: 'error'; message: string };

  let scan = $state<ScanState>({ kind: 'idle' });
  let repoUrl = $state('');
  let period = $state<Period>('7d');

  async function runScan() {
    if (!repoUrl.trim()) return;
    scan = { kind: 'loading' };
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ repoUrl, period })
      });
      if (!res.ok) {
        const text = await res.text();
        scan = { kind: 'error', message: text || `HTTP ${res.status}` };
        return;
      }
      const result: ScanResponse = await res.json();
      scan = { kind: 'success', result };
    } catch (e) {
      scan = { kind: 'error', message: e instanceof Error ? e.message : String(e) };
    }
  }
</script>

<header>
  <h1>QualitAI</h1>
  <p class="subtitle">Monitor GitHub Copilot review comments</p>
</header>

{#if data.user === null}
  <section class="card signin">
    <p>Sign in with your GitHub account to scan repositories.</p>
    <a class="primary-link" href="/login">Sign in with GitHub</a>
  </section>
{:else}
  <section class="card">
    <div class="auth-row">
      <span>
        Signed in as <strong>{data.user}</strong>
      </span>
      <form method="POST" action="/logout">
        <button class="link" type="submit">Log out</button>
      </form>
    </div>
  </section>

  <section class="card">
    <h2>Scan a repository</h2>
    <p class="muted">
      Scans merged PRs and counts Copilot review comments over the chosen period.
    </p>
    <form
      onsubmit={(e) => {
        e.preventDefault();
        runScan();
      }}
    >
      <div class="row">
        <input
          type="text"
          placeholder="https://github.com/owner/repo  or  owner/repo"
          bind:value={repoUrl}
          disabled={scan.kind === 'loading'}
        />
        <button type="submit" disabled={!repoUrl.trim() || scan.kind === 'loading'}>
          {scan.kind === 'loading' ? 'Scanning…' : 'Scan'}
        </button>
      </div>
      <fieldset class="periods" disabled={scan.kind === 'loading'}>
        <legend>Period</legend>
        {#each PERIODS as p (p)}
          <label class="period-option" class:selected={period === p}>
            <input type="radio" name="period" value={p} bind:group={period} />
            <span>{PERIOD_LABELS[p]}</span>
          </label>
        {/each}
      </fieldset>
    </form>

    {#if scan.kind === 'success'}
      {@const r = scan.result}
      {@const ratio = r.totalCopilot > 0 ? (r.withThumbdown / r.totalCopilot) * 100 : null}
      <div class="result">
        <p class="result-line">
          <span class="result-label">PRs merged in the {PERIOD_LABELS[r.period]}</span>
          <span class="result-value">{r.prScanned}</span>
        </p>
        <p class="result-line">
          <span class="result-label">Total Copilot comments</span>
          <span class="result-value">{r.totalCopilot}</span>
        </p>
        <p class="result-line">
          <span class="result-label">With at least one 👎</span>
          <span class="result-value">{r.withThumbdown}</span>
        </p>
        <p class="result-line ratio">
          <span class="result-label">Bad-comment ratio</span>
          <span class="result-value">
            {ratio === null ? '—' : `${ratio.toFixed(1)}%`}
          </span>
        </p>

        {#if Object.keys(r.decorationStats).length > 0}
          <div class="breakdown">
            <h3>Decoration breakdown</h3>
            <p class="result-line breakdown-header">
              <span class="result-label">decoration</span>
              <span class="breakdown-cells">
                <span>total</span>
                <span>👎</span>
                <span>ratio</span>
              </span>
            </p>
            {#each sortedDecorations(r.decorationStats) as [name, stats] (name)}
              <p class="result-line" class:no-deco={name === NO_DECORATION}>
                <span class="result-label">{name}</span>
                <span class="breakdown-cells">
                  <span class="cell-total">{stats.total}</span>
                  <span class="cell-bad">{stats.withThumbdown}</span>
                  <span class="cell-ratio">{ratioPct(stats.withThumbdown, stats.total)}</span>
                </span>
              </p>
            {/each}
          </div>
        {/if}

        <p class="muted small">
          Repo: <code>{r.owner}/{r.repo}</code> · since <code>{r.sinceIso}</code> · review comments (inline) only
        </p>
      </div>
    {:else if scan.kind === 'error'}
      <p class="error">{scan.message}</p>
    {/if}
  </section>
{/if}

<style>
  header {
    margin-bottom: 32px;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 28px;
    font-weight: 600;
  }
  .subtitle {
    margin: 0;
    color: #9aa3ad;
  }
  .card {
    background: #161a21;
    border: 1px solid #232831;
    border-radius: 8px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }
  .signin {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .auth-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .auth-row form {
    margin: 0;
  }
  h2 {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #c8cdd3;
  }
  .muted {
    color: #8b9098;
    margin: 0 0 12px;
  }
  .small {
    font-size: 12px;
  }
  .error {
    color: #f08a8a;
    margin: 8px 0;
    white-space: pre-wrap;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }
  .row {
    display: flex;
    gap: 8px;
  }
  .periods {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .periods legend {
    color: #8b9098;
    font-size: 12px;
    padding: 0 8px 0 0;
  }
  .period-option {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border: 1px solid #2c333d;
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    color: #c8cdd3;
    user-select: none;
  }
  .period-option input {
    display: none;
  }
  .period-option:hover {
    border-color: #3a4250;
  }
  .period-option.selected {
    background: #2c6fdb;
    border-color: #2c6fdb;
    color: white;
  }
  .periods:disabled .period-option {
    opacity: 0.5;
    cursor: not-allowed;
  }
  input[type='text'] {
    flex: 1;
    background: #0f1115;
    border: 1px solid #2c333d;
    border-radius: 6px;
    padding: 8px 12px;
    color: #e6e8eb;
    font: inherit;
  }
  input[type='text']:focus {
    outline: none;
    border-color: #4a90e2;
  }
  button {
    background: #2c6fdb;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  button:hover:not(:disabled) {
    background: #3a7fe5;
  }
  button:disabled {
    background: #2a3038;
    color: #6a7079;
    cursor: not-allowed;
  }
  .primary-link {
    display: inline-block;
    background: #2c6fdb;
    color: white;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
  }
  .primary-link:hover {
    background: #3a7fe5;
  }
  button.link {
    background: transparent;
    color: #6a9be6;
    padding: 0 4px;
    font-size: 12px;
    text-decoration: underline;
  }
  button.link:hover:not(:disabled) {
    background: transparent;
    color: #8ab4ec;
  }
  code {
    background: #0f1115;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 12px;
  }
  .result {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #232831;
  }
  .result-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin: 8px 0;
  }
  .result-label {
    color: #9aa3ad;
  }
  .result-value {
    font-size: 22px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .result-line.ratio {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px dashed #232831;
  }
  .result-line.ratio .result-value {
    font-size: 26px;
    color: #f0b86e;
  }
  .breakdown {
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #232831;
  }
  .breakdown h3 {
    margin: 0 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: #c8cdd3;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .breakdown .result-line {
    margin: 4px 0;
  }
  .breakdown-cells {
    display: grid;
    grid-template-columns: 48px 48px 64px;
    gap: 4px;
    text-align: right;
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .breakdown-header {
    color: #6a7079;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #232831;
    padding-bottom: 4px;
  }
  .breakdown-header .breakdown-cells {
    font-size: 11px;
    font-weight: 500;
    color: #6a7079;
  }
  .breakdown .cell-bad {
    color: #f08a8a;
  }
  .breakdown .cell-ratio {
    color: #f0b86e;
  }
  .breakdown .no-deco .result-label {
    font-style: italic;
    color: #6a7079;
  }
  .breakdown .no-deco .breakdown-cells {
    color: #8b9098;
  }
  .breakdown .no-deco .cell-bad,
  .breakdown .no-deco .cell-ratio {
    color: #8b9098;
  }
</style>
