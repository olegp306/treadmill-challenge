/**
 * Verification photos: captured at run start (kiosk), held on disk until the run result is saved,
 * then moved to a permanent path linked to `runs.verification_photo_path`.
 *
 * Relative paths are stored in SQLite (forward slashes), rooted under `data/`.
 */
import path from 'node:path';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';

function dataRoot(): string {
  return path.join(process.cwd(), 'data');
}

/** Relative path for DB column, e.g. photos/pending/<uuid>.jpg */
export function relativePendingPath(runSessionId: string): string {
  return `photos/pending/${runSessionId}.jpg`;
}

export function relativeFinalPath(runId: string): string {
  return `photos/runs/${runId}.jpg`;
}

export function absoluteFromRelative(rel: string): string {
  const norm = rel.replace(/\//g, path.sep);
  return path.join(dataRoot(), norm);
}

export function ensurePhotoDirs(): void {
  mkdirSync(path.join(dataRoot(), 'photos', 'pending'), { recursive: true });
  mkdirSync(path.join(dataRoot(), 'photos', 'runs'), { recursive: true });
}

export function writePendingJpeg(runSessionId: string, buffer: Buffer): string {
  ensurePhotoDirs();
  const rel = relativePendingPath(runSessionId);
  const abs = absoluteFromRelative(rel);
  writeFileSync(abs, buffer);
  return rel;
}

/** Move pending file to final location; returns final relative path. Overwrites final if exists. */
export function movePendingToFinal(pendingRel: string, runId: string): string {
  const finalRel = relativeFinalPath(runId);
  const from = absoluteFromRelative(pendingRel);
  const to = absoluteFromRelative(finalRel);
  mkdirSync(path.dirname(to), { recursive: true });
  if (!existsSync(from)) {
    throw new Error('pending_photo_file_missing');
  }
  if (existsSync(to)) unlinkSync(to);
  renameSync(from, to);
  return finalRel;
}

export function unlinkRelative(rel: string | null | undefined): void {
  if (!rel || !rel.trim()) return;
  const abs = absoluteFromRelative(rel);
  try {
    if (existsSync(abs)) unlinkSync(abs);
  } catch {
    /* ignore */
  }
}
