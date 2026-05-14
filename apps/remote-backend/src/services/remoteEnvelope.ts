function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Extract treadmill `DataSnapshotV1` from a remote envelope or a raw snapshot root. */
export function extractLocalSnapshot(root: unknown): Record<string, unknown> | null {
  if (!isRecord(root)) return null;
  const loc = root.local;
  if (isRecord(loc) && loc.snapshot != null && isRecord(loc.snapshot)) {
    return loc.snapshot as Record<string, unknown>;
  }
  if (Array.isArray(root.participants) && Array.isArray(root.runSessions)) {
    return root as Record<string, unknown>;
  }
  return null;
}

export function buildRemoteBackupEnvelopeV1(localSnapshot: unknown): unknown {
  const createdAt = new Date().toISOString();
  return {
    meta: {
      kind: 'remote-backup-v1',
      createdAt,
      remoteBackendVersion: process.env.REMOTE_APP_VERSION?.trim() || null,
    },
    local: { snapshot: localSnapshot },
    remote: {
      audit: { events: [] },
      monitoring: { latestStates: [], events: [] },
    },
  };
}

export function normalizeUserUploadToEnvelope(
  body: unknown
): { ok: true; envelope: unknown } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: 'Корень JSON должен быть объектом' };
  const meta = body.meta;
  if (isRecord(meta) && meta.kind === 'remote-backup-v1' && extractLocalSnapshot(body)) {
    return { ok: true, envelope: body };
  }
  if (Array.isArray(body.participants) && Array.isArray(body.runSessions)) {
    return { ok: true, envelope: buildRemoteBackupEnvelopeV1(body) };
  }
  return { ok: false, error: 'Нужен export local snapshot или remote-backup-v1 JSON' };
}
