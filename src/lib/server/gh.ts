import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export class GhError extends Error {
  constructor(message: string, public readonly stderr: string = '') {
    super(message);
    this.name = 'GhError';
  }
}

async function runGh(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('gh', args, {
      shell: false,
      maxBuffer: 32 * 1024 * 1024
    });
    return stdout;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    if (e.code === 'ENOENT') {
      throw new GhError('GitHub CLI `gh` not found in PATH. Install it from https://cli.github.com/.');
    }
    const stderr = (e.stderr ?? '').toString().trim();
    throw new GhError(stderr || e.message || 'gh command failed', stderr);
  }
}

export async function ghText(args: string[]): Promise<string> {
  return runGh(args);
}

export async function ghJson<T>(args: string[]): Promise<T> {
  const stdout = await runGh(args);
  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new GhError(`Failed to parse JSON output from gh ${args.join(' ')}`);
  }
}
