import { describe, expect, it, vi } from 'vitest';
import { createRunningChallengeResizeMessenger } from './iframeResizeMessenger';

function makeElement(scrollHeight: number, rectHeight: number) {
  return {
    scrollHeight,
    getBoundingClientRect: () => ({ height: rectHeight }),
  };
}

describe('createRunningChallengeResizeMessenger', () => {
  it('posts the maximum landing height to the Amazing Red parent', () => {
    const postMessage = vi.fn();
    const messenger = createRunningChallengeResizeMessenger({
      window: {
        parent: { postMessage },
        innerWidth: 1366,
        innerHeight: 800,
      },
      document: {
        documentElement: { scrollHeight: 1200 },
        body: { scrollHeight: 1300 },
        querySelector: (selector: string) => {
          if (selector === '#root') return makeElement(6400, 6410);
          if (selector === '.leaderboard2') return makeElement(6300, 6425);
          return null;
        },
      },
    });

    messenger.sendHeight();

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'running-challenge:resize', height: 6425 },
      'https://amazingred.ru'
    );
  });

  it('posts the full landing height when embedded on Amazing Red desktop', () => {
    const postMessage = vi.fn();
    const messenger = createRunningChallengeResizeMessenger({
      window: {
        parent: { postMessage },
        innerWidth: 1366,
        innerHeight: 6478,
      },
      document: {
        referrer: 'https://amazingred.ru/promo/running_challenge/',
        documentElement: { scrollHeight: 6478 },
        body: { scrollHeight: 6478 },
        querySelector: (selector: string) => {
          if (selector === '#root') return makeElement(6478, 6478);
          if (selector === '.leaderboard2') return makeElement(6478, 6478);
          return null;
        },
      },
    });

    messenger.sendHeight();

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'running-challenge:resize', height: 6478 },
      'https://amazingred.ru'
    );
  });

  it('uses an internal iframe scroll window when embedded on Amazing Red mobile', () => {
    const postMessage = vi.fn();
    const messenger = createRunningChallengeResizeMessenger({
      window: {
        parent: { postMessage },
        innerWidth: 390,
        innerHeight: 6478,
      },
      document: {
        referrer: 'https://amazingred.ru/promo/running_challenge/',
        documentElement: { scrollHeight: 6478 },
        body: { scrollHeight: 6478 },
        querySelector: (selector: string) => {
          if (selector === '#root') return makeElement(6478, 6478);
          if (selector === '.leaderboard2') return makeElement(6478, 6478);
          return null;
        },
      },
    });

    messenger.sendHeight();

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'running-challenge:resize', height: 800 },
      'https://amazingred.ru'
    );
  });

  it('posts scroll handoff messages when embedded on Amazing Red', () => {
    const postMessage = vi.fn();
    const messenger = createRunningChallengeResizeMessenger({
      window: {
        parent: { postMessage },
        innerWidth: 390,
        innerHeight: 800,
      },
      document: {
        referrer: 'https://amazingred.ru/promo/running_challenge/',
        documentElement: { scrollHeight: 6478 },
        body: { scrollHeight: 6478 },
        querySelector: () => null,
      },
    });

    messenger.sendScroll(320);

    expect(postMessage).toHaveBeenCalledWith(
      { type: 'running-challenge:scroll', deltaY: 320 },
      'https://amazingred.ru'
    );
  });

  it('does not install scroll handoff listeners on Amazing Red mobile', () => {
    const postMessage = vi.fn();
    const addEventListener = vi.fn();
    const messenger = createRunningChallengeResizeMessenger({
      window: {
        parent: { postMessage },
        innerWidth: 390,
        innerHeight: 800,
        addEventListener,
      },
      document: {
        referrer: 'https://amazingred.ru/promo/running_challenge/',
        documentElement: { scrollHeight: 6478 },
        body: { scrollHeight: 6478 },
        querySelector: () => null,
      },
    });

    messenger.start();

    expect(addEventListener).not.toHaveBeenCalledWith('wheel', expect.any(Function), expect.anything());
    expect(addEventListener).not.toHaveBeenCalledWith('touchmove', expect.any(Function), expect.anything());
  });

  it('keeps scroll handoff listeners on Amazing Red desktop', () => {
    const postMessage = vi.fn();
    const addEventListener = vi.fn();
    const messenger = createRunningChallengeResizeMessenger({
      window: {
        parent: { postMessage },
        innerWidth: 1366,
        innerHeight: 800,
        addEventListener,
      },
      document: {
        referrer: 'https://amazingred.ru/promo/running_challenge/',
        documentElement: { scrollHeight: 6478 },
        body: { scrollHeight: 6478 },
        querySelector: () => null,
      },
    });

    messenger.start();

    expect(addEventListener).toHaveBeenCalledWith('wheel', expect.any(Function), { passive: false });
    expect(addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: false });
  });
});
