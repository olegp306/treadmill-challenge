import path from 'node:path';
import { mkdir, appendFile, readdir, stat, unlink } from 'node:fs/promises';
import { runtimeRootDir } from '../runtimePaths.js';

export type AuditRecord = {
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  userAgent: string | null;
  timestamp: string; // ISO
  metadata: Record<string, unknown> | null;
};

const BASE_DIR = () => path.join(runtimeRootDir(), 'audit');

function dayFolder(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'invalid-date';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function filePath(iso: string): string {
  return path.join(BASE_DIR(), dayFolder(iso), 'audit.jsonl');
}

function clampMetadata(meta: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!meta) return null;
  const json = JSON.stringify(meta);
  const max = 16 * 1024;
  if (Buffer.byteLength(json, 'utf8') <= max) return meta;
  return { truncated: true, originalSize: Buffer.byteLength(json, 'utf8') };
}

export async function writeAudit(record: Omit<AuditRecord, 'timestamp' | 'metadata'> & { timestamp?: string; metadata?: Record<string, unknown> | null }): Promise<void> {
  const timestamp = record.timestamp ?? new Date().toISOString();
  const rec: AuditRecord = { ...record, timestamp, metadata: clampMetadata(record.metadata ?? null) };
  const fp = filePath(timestamp);
  await mkdir(path.dirname(fp), { recursive: true });
  await appendFile(fp, `${JSON.stringify(rec)}\n`, 'utf8');
}

export async function cleanupAudit(opts: { maxDays: number; nowIso: string }): Promise<void> {
  const cutoffMs = new Date(opts.nowIso).getTime() - opts.maxDays * 24 * 60_000 * 60;
  if (!Number.isFinite(cutoffMs)) return;
  const base = BASE_DIR();
  const dayDirs = await readdir(base).catch(() => [] as string[]);
  for (const d of dayDirs) {
    const full = path.join(base, d);
    const st = await stat(full).catch(() => null);
    if (!st || !st.isDirectory()) continue;
    const parsed = new Date(`${d}T00:00:00.000Z`).getTime();
    if (Number.isFinite(parsed) && parsed < cutoffMs) {
      const files = await readdir(full).catch(() => [] as string[]);
      await Promise.all(files.map((f) => unlink(path.join(full, f)).catch(() => undefined)));
    }
  }
}

