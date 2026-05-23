import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { buildStatusReplyMarkup, registerTelegramBotRoutes, sendTelegramAlert } from './telegramBot.js';

function firstFetchInit(fetchMock: ReturnType<typeof vi.fn>): RequestInit {
  const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit]>;
  return calls[0]![1];
}

describe('telegram bot integration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('builds a status page inline keyboard when a status URL is configured', () => {
    process.env.TELEGRAM_STATUS_PAGE_URL = 'https://example.com/admin';

    expect(buildStatusReplyMarkup()).toEqual({
      inline_keyboard: [[{ text: 'Открыть состояние Treadmill Challenge', url: 'https://example.com/admin' }]],
    });
  });

  it('sends alerts to Telegram with the status page button', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-1';
    process.env.TELEGRAM_CHAT_ID = 'chat-1';
    process.env.TELEGRAM_STATUS_PAGE_URL = 'https://example.com/admin';
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await sendTelegramAlert('critical alert');

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = firstFetchInit(fetchMock);
    const body = JSON.parse(String(init?.body));
    expect(body.chat_id).toBe('chat-1');
    expect(body.text).toBe('critical alert');
    expect(body.reply_markup.inline_keyboard[0][0].url).toBe('https://example.com/admin');
  });

  it('webhook replies with a status button for /status', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'token-1';
    process.env.TELEGRAM_STATUS_PAGE_URL = 'https://example.com/admin';
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const app = Fastify({ logger: false });
    await registerTelegramBotRoutes(app);
    await app.ready();

    const res = await app.inject({
      method: 'POST',
      url: '/api/telegram/webhook',
      payload: {
        update_id: 1,
        message: {
          message_id: 10,
          chat: { id: 123 },
          text: '/status',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, handled: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const init = firstFetchInit(fetchMock);
    const body = JSON.parse(String(init?.body));
    expect(body.chat_id).toBe(123);
    expect(body.reply_markup.inline_keyboard[0][0].text).toBe('Открыть состояние Treadmill Challenge');

    await app.close();
  });
});
