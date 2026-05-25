const KEY = 'qualitai:repoHistory';
const MAX = 5;

export function loadHistory(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is string => typeof s === 'string').slice(0, MAX);
  } catch {
    return [];
  }
}

export function pushHistory(entry: string): string[] {
  if (typeof localStorage === 'undefined') return loadHistory();
  const trimmed = entry.trim();
  if (!trimmed) return loadHistory();
  const current = loadHistory();
  const deduped = current.filter((s) => s !== trimmed);
  const next = [trimmed, ...deduped].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / disabled */
  }
  return next;
}

export function clearHistory(): string[] {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  return [];
}
