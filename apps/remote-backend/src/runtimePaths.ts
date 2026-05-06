import path from 'node:path';

export function runtimeRootDir(): string {
  const raw = process.env.REMOTE_RUNTIME_DIR?.trim();
  if (raw) return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
  return path.resolve(process.cwd(), 'runtime', 'remote');
}

