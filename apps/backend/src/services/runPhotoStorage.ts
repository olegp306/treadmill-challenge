/**
 * Verification photos: stored on disk per **run** (tied to `runSessionId` through the `runs` row).
 * TouchDesigner sends JPEG in the same request as run results; the file is written to `data/photos/runs/<runId>.jpg`.
 * Legacy: `photos/pending/<runSessionId>.jpg` may still be finalized on result if no inline image (old data only).
 */
import path from 'node:path';
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';

const MAX_VERIFICATION_JPEG_BYTES = 6 * 1024 * 1024;

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

function stripDataUrlBase64(raw: string): string {
  const s = raw.trim();
  const m = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(s);
  return m ? m[1] : s;
}

export type ParseJpegResult = { ok: true; buffer: Buffer } | { ok: false; reason: string };

/** Decode base64 / data-URL payload; validate size and JPEG magic bytes. */
export function parseVerificationJpegFromBase64Input(raw: string): ParseJpegResult {
  let buf: Buffer;
  try {
    const cleaned = stripDataUrlBase64(raw);
    buf = Buffer.from(cleaned, 'base64');
  } catch {
    return { ok: false, reason: 'invalid_base64' };
  }
  if (buf.length === 0 || buf.length > MAX_VERIFICATION_JPEG_BYTES) {
    return { ok: false, reason: 'size' };
  }
  const jpegMagic = buf[0] === 0xff && buf[1] === 0xd8;
  if (!jpegMagic) {
    return { ok: false, reason: 'not_jpeg' };
  }
  return { ok: true, buffer: buf };
}

export function writeFinalVerificationJpeg(runId: string, buffer: Buffer): string {
  ensurePhotoDirs();
  const rel = relativeFinalPath(runId);
  const abs = absoluteFromRelative(rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, buffer);
  return rel;
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
