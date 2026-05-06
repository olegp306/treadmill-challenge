import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import type { Severity, HealthProblem } from './severity.js';
import { runtimeRootDir } from '../runtimePaths.js';

type AlertState = Record<string, { lastSentAt: string }>;

const STATE_PATH = () => path.join(runtimeRootDir(), 'monitoring', 'alerts-state.json');

async function readState(): Promise<AlertState> {
  try {
    const raw = await readFile(STATE_PATH(), 'utf8');
    const parsed = JSON.parse(raw) as AlertState;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

async function writeState(state: AlertState): Promise<void> {
  await mkdir(path.dirname(STATE_PATH()), { recursive: true });
  await writeFile(STATE_PATH(), JSON.stringify(state, null, 2), 'utf8');
}

function alertKey(parts: { projectId: string; locationId: string; deviceId: string; problemCode: string }): string {
  return `${parts.projectId}\t${parts.locationId}\t${parts.deviceId}\t${parts.problemCode}`;
}

function formatAlertText(input: {
  severity: Severity;
  projectId: string;
  locationId: string;
  deviceId: string;
  problem: HealthProblem;
  detectedAt: string;
  lastSignalAt: string | null;
}): string {
  const sev = input.severity.toUpperCase();
  const last = input.lastSignalAt ? input.lastSignalAt : '—';
  return `[${sev}] ${input.projectId} / ${input.locationId} / ${input.deviceId}\nProblem: ${input.problem.message}\nLast signal: ${last}\nDetected at: ${input.detectedAt}`;
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).then(async (r) => {
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      throw new Error(`telegram_http_${r.status}${t ? `: ${t}` : ''}`);
    }
  });
}

async function sendEmail(subject: string, text: string): Promise<void> {
  const to = process.env.ALERT_EMAIL_TO?.trim();
  if (!to) return;
  const { default: nodemailer } = await import('nodemailer');
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.ALERT_EMAIL_FROM?.trim() || user || 'alerts@example.com';
  if (!host || !user || !pass) return;
  const transporter = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure: false,
    auth: { user, pass },
  });
  await transporter.sendMail({ from, to, subject, text });
}

export async function emitAlerts(input: {
  projectId: string;
  locationId: string;
  deviceId: string;
  severity: Severity;
  problems: HealthProblem[];
  detectedAt: string;
  lastSignalAt: string | null;
}): Promise<{ sent: number; skipped: number }> {
  if (input.severity === 'ok' || input.problems.length === 0) return { sent: 0, skipped: 0 };
  const cooldownMs = 10 * 60_000;
  const nowMs = new Date(input.detectedAt).getTime();
  const state = await readState();

  let sent = 0;
  let skipped = 0;

  for (const p of input.problems) {
    const k = alertKey({ projectId: input.projectId, locationId: input.locationId, deviceId: input.deviceId, problemCode: p.code });
    const last = state[k]?.lastSentAt ?? null;
    const lastMs = last ? new Date(last).getTime() : null;
    const within = lastMs != null && Number.isFinite(lastMs) && nowMs - lastMs < cooldownMs;
    if (within) {
      skipped += 1;
      continue;
    }
    const text = formatAlertText({
      severity: input.severity,
      projectId: input.projectId,
      locationId: input.locationId,
      deviceId: input.deviceId,
      problem: p,
      detectedAt: input.detectedAt,
      lastSignalAt: input.lastSignalAt,
    });
    const subject = `[${input.severity.toUpperCase()}] ${input.projectId}/${input.locationId}/${input.deviceId} ${p.code}`;
    await Promise.all([sendTelegram(text), sendEmail(subject, text)]).catch((e) => {
      // Do not throw hard; still update cooldown to avoid loops if provider is down.
      void e;
    });
    state[k] = { lastSentAt: input.detectedAt };
    sent += 1;
  }

  await writeState(state);
  return { sent, skipped };
}

