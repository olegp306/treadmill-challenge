import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { runtimeRootDir } from '../runtimePaths.js';

export type TelegramSettings = {
  botToken: string | null;
  chatId: string | null;
  statusPageUrl: string | null;
  webhookSecret: string | null;
  alertsEnabled: boolean;
};

export type PublicTelegramSettings = {
  botTokenConfigured: boolean;
  botTokenPreview: string | null;
  chatId: string | null;
  statusPageUrl: string | null;
  webhookSecretConfigured: boolean;
  alertsEnabled: boolean;
  source: {
    botToken: 'runtime' | 'env' | 'missing';
    chatId: 'runtime' | 'env' | 'missing';
    statusPageUrl: 'runtime' | 'env' | 'derived' | 'missing';
    webhookSecret: 'runtime' | 'env' | 'missing';
  };
};

export type TelegramSettingsUpdate = {
  botToken?: string | null;
  chatId?: string | null;
  statusPageUrl?: string | null;
  webhookSecret?: string | null;
  alertsEnabled?: boolean;
};

const SETTINGS_PATH = () => path.join(runtimeRootDir(), 'settings', 'telegram.json');

function cleanString(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s : null;
}

function env(name: string): string | null {
  return cleanString(process.env[name]);
}

function envStatusPageUrl(): string | null {
  const explicit = env('TELEGRAM_STATUS_PAGE_URL') ?? env('REMOTE_STATUS_PAGE_URL');
  if (explicit) return explicit;
  const publicBase = env('REMOTE_PUBLIC_BASE_URL');
  return publicBase ? `${publicBase.replace(/\/+$/, '')}/admin` : null;
}

function previewSecret(v: string | null): string | null {
  if (!v) return null;
  if (v.length <= 8) return 'configured';
  return `...${v.slice(-4)}`;
}

async function readRuntimeSettings(): Promise<Partial<TelegramSettings>> {
  try {
    const raw = await readFile(SETTINGS_PATH(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<TelegramSettings>;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed;
  } catch {
    return {};
  }
}

export async function readEffectiveTelegramSettings(): Promise<TelegramSettings> {
  const runtime = await readRuntimeSettings();
  return {
    botToken: cleanString(runtime.botToken) ?? env('TELEGRAM_BOT_TOKEN'),
    chatId: cleanString(runtime.chatId) ?? env('TELEGRAM_CHAT_ID'),
    statusPageUrl: cleanString(runtime.statusPageUrl) ?? envStatusPageUrl(),
    webhookSecret: cleanString(runtime.webhookSecret) ?? env('TELEGRAM_WEBHOOK_SECRET'),
    alertsEnabled: typeof runtime.alertsEnabled === 'boolean' ? runtime.alertsEnabled : true,
  };
}

export async function readPublicTelegramSettings(): Promise<PublicTelegramSettings> {
  const runtime = await readRuntimeSettings();
  const effective = await readEffectiveTelegramSettings();
  const runtimeStatusUrl = cleanString(runtime.statusPageUrl);
  const explicitStatusUrl = env('TELEGRAM_STATUS_PAGE_URL') ?? env('REMOTE_STATUS_PAGE_URL');
  const derivedStatusUrl = env('REMOTE_PUBLIC_BASE_URL');
  return {
    botTokenConfigured: Boolean(effective.botToken),
    botTokenPreview: previewSecret(effective.botToken),
    chatId: effective.chatId,
    statusPageUrl: effective.statusPageUrl,
    webhookSecretConfigured: Boolean(effective.webhookSecret),
    alertsEnabled: effective.alertsEnabled,
    source: {
      botToken: cleanString(runtime.botToken) ? 'runtime' : env('TELEGRAM_BOT_TOKEN') ? 'env' : 'missing',
      chatId: cleanString(runtime.chatId) ? 'runtime' : env('TELEGRAM_CHAT_ID') ? 'env' : 'missing',
      statusPageUrl: runtimeStatusUrl ? 'runtime' : explicitStatusUrl ? 'env' : derivedStatusUrl ? 'derived' : 'missing',
      webhookSecret: cleanString(runtime.webhookSecret) ? 'runtime' : env('TELEGRAM_WEBHOOK_SECRET') ? 'env' : 'missing',
    },
  };
}

export async function updateTelegramSettings(update: TelegramSettingsUpdate): Promise<PublicTelegramSettings> {
  const current = await readRuntimeSettings();
  const next: TelegramSettings = {
    botToken: 'botToken' in update ? cleanString(update.botToken) : cleanString(current.botToken),
    chatId: 'chatId' in update ? cleanString(update.chatId) : cleanString(current.chatId),
    statusPageUrl: 'statusPageUrl' in update ? cleanString(update.statusPageUrl) : cleanString(current.statusPageUrl),
    webhookSecret: 'webhookSecret' in update ? cleanString(update.webhookSecret) : cleanString(current.webhookSecret),
    alertsEnabled: typeof update.alertsEnabled === 'boolean' ? update.alertsEnabled : current.alertsEnabled !== false,
  };
  await mkdir(path.dirname(SETTINGS_PATH()), { recursive: true });
  await writeFile(SETTINGS_PATH(), JSON.stringify(next, null, 2), 'utf8');
  return readPublicTelegramSettings();
}
