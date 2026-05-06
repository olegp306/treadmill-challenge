import type { HealthPayload } from './healthSchema.js';

export type Severity = 'ok' | 'warning' | 'critical';

export type HealthProblem = {
  code: string;
  message: string;
};

export type LatestHealthState = {
  key: string;
  projectId: string;
  locationId: string;
  deviceId: string;
  lastReceivedAt: string; // ISO
  lastPayloadTimestamp: string; // ISO from payload
  severity: Severity;
  problems: HealthProblem[];
};

function msSince(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return nowMs - t;
}

export function healthKey(p: Pick<HealthPayload, 'projectId' | 'locationId' | 'deviceId'>): string {
  return `${p.projectId}\t${p.locationId}\t${p.deviceId}`;
}

export function calculateHealthSeverity(
  payload: HealthPayload,
  previous: LatestHealthState | null,
  receivedAtIso: string
): { severity: Severity; problems: HealthProblem[] } {
  const nowMs = Date.now();
  const problems: Array<{ severity: Exclude<Severity, 'ok'>; problem: HealthProblem }> = [];

  const lastReceivedMsAgo = msSince(previous?.lastReceivedAt ?? null, nowMs);
  if (lastReceivedMsAgo != null && lastReceivedMsAgo > 2 * 60_000) {
    problems.push({
      severity: 'critical',
      problem: { code: 'DEVICE_STALE', message: 'Device did not post health for more than 2 minutes' },
    });
  }

  // PC
  if (payload.pc.internet === false) {
    problems.push({ severity: 'critical', problem: { code: 'PC_INTERNET_OFFLINE', message: 'PC internet is offline' } });
  }
  if (payload.pc.diskFreeGb != null && payload.pc.diskFreeGb < 5) {
    problems.push({ severity: 'critical', problem: { code: 'PC_LOW_DISK', message: 'PC disk free is below 5 GB' } });
  } else if (payload.pc.diskFreeGb != null && payload.pc.diskFreeGb < 20) {
    problems.push({ severity: 'warning', problem: { code: 'PC_DISK_LOW', message: 'PC disk free is below 20 GB' } });
  }
  if (payload.pc.cpu != null && payload.pc.cpu > 90) {
    problems.push({ severity: 'warning', problem: { code: 'PC_HIGH_CPU', message: 'PC CPU usage is above 90%' } });
  }
  if (payload.pc.ram != null && payload.pc.ram > 90) {
    problems.push({ severity: 'warning', problem: { code: 'PC_HIGH_RAM', message: 'PC RAM usage is above 90%' } });
  }

  // TouchDesigner (optional)
  const td = payload.touchDesigner ?? null;
  if (td) {
    if (td.fileExists === false) {
      problems.push({ severity: 'critical', problem: { code: 'TD_FILE_MISSING', message: 'TouchDesigner health file is missing' } });
    }
    const tdStaleMsAgo = msSince(td.lastUpdatedAt ?? null, nowMs);
    if (tdStaleMsAgo != null && tdStaleMsAgo > 60_000) {
      problems.push({
        severity: 'critical',
        problem: { code: 'TD_FILE_STALE', message: 'TouchDesigner health file was not updated for more than 1 minute' },
      });
    }
    if (td.appRunning === false) {
      problems.push({ severity: 'critical', problem: { code: 'TD_APP_NOT_RUNNING', message: 'TouchDesigner is not running' } });
    }
    if (td.projectLoaded === false) {
      problems.push({ severity: 'critical', problem: { code: 'TD_PROJECT_NOT_LOADED', message: 'TouchDesigner project is not loaded' } });
    }
    if (td.fps != null && td.fps < 30) {
      problems.push({ severity: 'warning', problem: { code: 'TD_LOW_FPS', message: 'TouchDesigner FPS is below 30' } });
    }
    if (td.cookTimeMs != null && td.cookTimeMs > 50) {
      problems.push({ severity: 'warning', problem: { code: 'TD_HIGH_COOK', message: 'TouchDesigner cook time is above 50 ms' } });
    }
  }

  // iPad (optional)
  const ipad = payload.ipad ?? null;
  if (ipad) {
    if (ipad.online === false) {
      problems.push({ severity: 'critical', problem: { code: 'IPAD_OFFLINE', message: 'iPad is offline' } });
    }
    const ipadStaleMsAgo = msSince(ipad.lastSeen ?? null, nowMs);
    if (ipadStaleMsAgo != null && ipadStaleMsAgo > 60_000) {
      problems.push({ severity: 'critical', problem: { code: 'IPAD_STALE', message: 'iPad lastSeen is older than 1 minute' } });
    }
    if (ipad.appActive === false) {
      problems.push({ severity: 'critical', problem: { code: 'IPAD_APP_INACTIVE', message: 'iPad app is inactive' } });
    }
    if (ipad.battery != null && ipad.battery < 20) {
      problems.push({ severity: 'warning', problem: { code: 'IPAD_LOW_BATTERY', message: 'iPad battery is below 20%' } });
    }
  }

  const hasErrors =
    payload.agent.errors.length > 0 ||
    payload.pc.errors.length > 0 ||
    (payload.touchDesigner?.errors?.length ?? 0) > 0 ||
    (payload.ipad?.errors?.length ?? 0) > 0;
  if (hasErrors) {
    problems.push({ severity: 'warning', problem: { code: 'HAS_ERRORS', message: 'Health payload contains errors' } });
  }

  const severity: Severity =
    problems.some((p) => p.severity === 'critical') ? 'critical' : problems.some((p) => p.severity === 'warning') ? 'warning' : 'ok';

  // Deduplicate by code (keep first message)
  const seen = new Set<string>();
  const out: HealthProblem[] = [];
  for (const p of problems) {
    if (seen.has(p.problem.code)) continue;
    seen.add(p.problem.code);
    out.push(p.problem);
  }

  void receivedAtIso; // reserved for future: include receivedAt-based checks
  return { severity, problems: out };
}

