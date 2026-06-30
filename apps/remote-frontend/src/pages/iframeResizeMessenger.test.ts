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
});
