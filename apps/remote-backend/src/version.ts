import { readFileSync } from 'node:fs';

type PackageJson = { version?: unknown };

let cachedVersion: string | null = null;

export function remoteBackendVersion(): string {
  if (cachedVersion) return cachedVersion;
  const envVersion = process.env.REMOTE_APP_VERSION?.trim();
  if (envVersion) {
    cachedVersion = envVersion;
    return cachedVersion;
  }
  try {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as PackageJson;
    cachedVersion = typeof pkg.version === 'string' && pkg.version.trim() ? pkg.version.trim() : 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }
  return cachedVersion;
}
