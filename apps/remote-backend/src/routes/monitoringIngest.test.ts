import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { registerMonitoringIngestRoutes } from './monitoringIngest.js';
import { readLatestState, cleanupOldHealthEvents } from '../monitoring/storage.js';
import { emitAlerts } from '../monitoring/alerts.js';
import path from 'node:path';
import os from 'node:os';
import { mkdir, writeFile, readdir } from 'node:fs/promises';

const HEALTH_KEY = 'test-key';

function validPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    projectId: 'project-01',
    locationId: 'munich-01',
    deviceId: 'pc-01',
    timestamp: new Date().toISOString(),
    agent: { version: '1.0.0', startedAt: new Date().toISOString(), lastSuccessfulPostAt: new Date().toISOString(), errors: [] },
    pc: { status: 'ok', cpu: 10, ram: 10, diskFreeGb: 100, appRunning: true, internet: true, errors: [] },
    ...overrides,
  };
}

describe('POST /api/monitoring/health', () => {
  const app = Fastify({ logger: false });
  const tmp = path.join(os.tmpdir(), `treadmill-remote-backend-tests-${Date.now()}-${Math.random().toString(16).slice(2)}`);

  beforeAll(async () => {
    process.env.HEALTH_API_KEY = HEALTH_KEY;
    process.env.REMOTE_RUNTIME_DIR = tmp;
    await registerMonitoringIngestRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects unauthorized', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/monitoring/health', payload: validPayload() });
    expect(res.statusCode).toBe(401);
  });

  it('returns 413 when payload is larger than 64KB', async () => {
    const big = 'x'.repeat(70 * 1024);
    const res = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY, 'content-type': 'application/json' },
      payload: JSON.stringify({ ...validPayload({ deviceId: 'pc-big' }), pc: { status: 'ok', cpu: 10, ram: 10, diskFreeGb: 100, appRunning: true, internet: true, errors: [big] } }),
    });
    expect(res.statusCode).toBe(413);
  });

  it('accepts valid payload without optional blocks', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY },
      payload: validPayload({ touchDesigner: undefined, ipad: undefined }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(['ok', 'warning', 'critical']).toContain(body.severity);
    expect(Array.isArray(body.problems)).toBe(true);
  });

  it('returns 429 when rate limited', async () => {
    const p = validPayload({ deviceId: 'pc-rl' });
    const a = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY },
      payload: p,
    });
    expect(a.statusCode).toBe(200);
    const b = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY },
      payload: p,
    });
    expect(b.statusCode).toBe(429);
    expect(b.headers['retry-after']).toBeTruthy();
  });

  it('flags low disk as critical', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY },
      payload: validPayload({ deviceId: 'pc-disk', pc: { status: 'ok', cpu: 10, ram: 10, diskFreeGb: 1, appRunning: true, internet: true, errors: [] } }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.severity).toBe('critical');
    expect(body.problems.some((p: { code: string }) => p.code === 'PC_LOW_DISK')).toBe(true);

    const latest = await readLatestState('project-01\tmunich-01\tpc-disk');
    expect(latest?.severity).toBe('critical');
  });

  it('flags TD stale as critical (TD_FILE_STALE)', async () => {
    const stale = new Date(Date.now() - 2 * 60_000).toISOString();
    const res = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY },
      payload: validPayload({
        deviceId: 'pc-td',
        touchDesigner: {
          fileExists: true,
          lastUpdatedAt: stale,
          appRunning: true,
          projectLoaded: true,
          fps: 60,
          cookTimeMs: 10,
          kinectUpdating: true,
          outputAvailable: true,
          backendReachable: true,
          landingReachable: true,
          raceResultCreated: true,
          errors: [],
        },
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.severity).toBe('critical');
    expect(body.problems.some((p: { code: string }) => p.code === 'TD_FILE_STALE')).toBe(true);
  });

  it('flags iPad offline as critical', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/monitoring/health',
      headers: { 'x-health-api-key': HEALTH_KEY },
      payload: validPayload({
        deviceId: 'pc-ipad',
        ipad: { ipadId: 'ipad-01', ip: '1.1.1.1', online: false, lastSeen: new Date().toISOString(), battery: 50, appActive: true, errors: [] },
      }),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.severity).toBe('critical');
    expect(body.problems.some((p: { code: string }) => p.code === 'IPAD_OFFLINE')).toBe(true);
  });

  it('alert deduplication skips within 10 minutes', async () => {
    const detectedAt = new Date().toISOString();
    const first = await emitAlerts({
      projectId: 'project-01',
      locationId: 'munich-01',
      deviceId: 'pc-alert',
      severity: 'critical',
      problems: [{ code: 'PC_INTERNET_OFFLINE', message: 'PC internet is offline' }],
      detectedAt,
      lastSignalAt: null,
    });
    expect(first.sent).toBe(1);
    const second = await emitAlerts({
      projectId: 'project-01',
      locationId: 'munich-01',
      deviceId: 'pc-alert',
      severity: 'critical',
      problems: [{ code: 'PC_INTERNET_OFFLINE', message: 'PC internet is offline' }],
      detectedAt: new Date(Date.now() + 60_000).toISOString(),
      lastSignalAt: null,
    });
    expect(second.skipped).toBe(1);
  });

  it('cleanup old health events deletes day folders older than retention', async () => {
    const eventsDir = path.join(tmp, 'monitoring', 'events', '2000-01-01');
    await mkdir(eventsDir, { recursive: true });
    await writeFile(path.join(eventsDir, 'events.jsonl'), '{}\n', 'utf8');
    await cleanupOldHealthEvents({ maxDays: 7, maxPerDevice: 10_000, nowIso: new Date().toISOString() });
    const left = await readdir(eventsDir).catch(() => []);
    expect(left.length).toBe(0);
  });
});

