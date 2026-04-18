import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Single product version for the monorepo (see root package.json `name`: treadmill-challenge).
 * Override at deploy time with APP_VERSION if needed.
 */
export function getAppVersion(): string {
  const env = process.env.APP_VERSION?.trim();
  if (env) return env;
  const candidates = [
    path.join(process.cwd(), 'package.json'),
    path.join(process.cwd(), '..', '..', 'package.json'),
    path.join(process.cwd(), '..', 'package.json'),
  ];
  for (const p of candidates) {
    try {
      if (!existsSync(p)) continue;
      const j = JSON.parse(readFileSync(p, 'utf8')) as { name?: string; version?: string };
      if (j.name === 'treadmill-challenge' && typeof j.version === 'string') return j.version;
    } catch {
      /* ignore */
    }
  }
  return '0.0.0';
}
