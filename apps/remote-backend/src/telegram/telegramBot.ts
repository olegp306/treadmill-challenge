import type { FastifyInstance } from 'fastify';
import { readEffectiveTelegramSettings } from './telegramSettings.js';

type TelegramReplyMarkup = {
  inline_keyboard: Array<Array<{ text: string; url: string }>>;
};

type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string };
    text?: string;
  };
};

export function statusPageUrl(): string | null {
  const explicit = process.env.TELEGRAM_STATUS_PAGE_URL?.trim() || process.env.REMOTE_STATUS_PAGE_URL?.trim() || null;
  if (explicit) return explicit;
  const publicBase = process.env.REMOTE_PUBLIC_BASE_URL?.trim() || null;
  if (!publicBase) return null;
  return `${publicBase.replace(/\/+$/, '')}/admin`;
}

export function buildStatusReplyMarkup(url = statusPageUrl()): TelegramReplyMarkup | undefined {
  if (!url) return undefined;
  return {
    inline_keyboard: [[{ text: 'Открыть состояние Treadmill Challenge', url }]],
  };
}

async function sendTelegramMessage(input: {
  botToken: string;
  chatId: string | number;
  text: string;
  replyMarkup?: TelegramReplyMarkup;
}): Promise<void> {
  const url = `https://api.telegram.org/bot${input.botToken}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: input.chatId,
    text: input.text,
  };
  if (input.replyMarkup) body.reply_markup = input.replyMarkup;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`telegram_http_${res.status}${text ? `: ${text}` : ''}`);
  }
}

export async function sendTelegramAlert(text: string): Promise<void> {
  const settings = await readEffectiveTelegramSettings();
  if (!settings.alertsEnabled || !settings.botToken || !settings.chatId) return;
  await sendTelegramMessage({
    botToken: settings.botToken,
    chatId: settings.chatId,
    text,
    replyMarkup: buildStatusReplyMarkup(settings.statusPageUrl),
  });
}

export async function sendTelegramStatusButton(chatId: string | number): Promise<void> {
  const settings = await readEffectiveTelegramSettings();
  if (!settings.botToken) return;
  await sendTelegramMessage({
    botToken: settings.botToken,
    chatId,
    text: 'Страница состояния Treadmill Challenge:',
    replyMarkup: buildStatusReplyMarkup(settings.statusPageUrl),
  });
}

function isStatusCommand(text: string | undefined): boolean {
  const normalized = text?.trim().toLowerCase();
  return normalized === '/start' || normalized === '/status' || normalized === 'status' || normalized === 'статус';
}

async function webhookSecretOk(headers: Record<string, unknown>): Promise<boolean> {
  const secret = (await readEffectiveTelegramSettings()).webhookSecret;
  if (!secret) return true;
  const raw = headers['x-telegram-bot-api-secret-token'];
  return typeof raw === 'string' && raw === secret;
}

export async function registerTelegramBotRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/telegram/webhook', async (request, reply) => {
    if (!(await webhookSecretOk(request.headers))) {
      return reply.status(401).send({ ok: false, error: 'Unauthorized' });
    }

    const update = request.body as TelegramUpdate;
    const chatId = update?.message?.chat?.id;
    const text = update?.message?.text;

    if (chatId == null || !isStatusCommand(text)) {
      return reply.send({ ok: true, handled: false });
    }

    await sendTelegramStatusButton(chatId);
    return reply.send({ ok: true, handled: true });
  });
}
