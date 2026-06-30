const RUNNING_CHALLENGE_PARENT_ORIGIN = 'https://amazingred.ru';
const RUNNING_CHALLENGE_RESIZE_MESSAGE = 'running-challenge:resize';

type MeasurableElement = {
  scrollHeight?: number;
  getBoundingClientRect?: () => { height?: number };
};

type ResizeMessengerParent = {
  postMessage: (message: { type: string; height: number }, targetOrigin: string) => void;
};

type ResizeMessengerWindow = {
  parent: ResizeMessengerParent | ResizeMessengerWindow;
  postMessage?: ResizeMessengerParent['postMessage'];
  innerHeight: number;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
  cancelAnimationFrame?: (handle: number) => void;
  setTimeout?: (callback: () => void, delay?: number) => number;
  clearTimeout?: (handle: number) => void;
  addEventListener?: Window['addEventListener'];
  removeEventListener?: Window['removeEventListener'];
  ResizeObserver?: typeof ResizeObserver;
  MutationObserver?: typeof MutationObserver;
};

type ResizeMessengerDocument = {
  documentElement: MeasurableElement;
  body: MeasurableElement;
  querySelector: (selector: string) => MeasurableElement | null;
  fonts?: {
    ready: Promise<unknown>;
  };
};

type ResizeMessengerDeps = {
  window: ResizeMessengerWindow;
  document: ResizeMessengerDocument;
};

function getElementHeight(element: MeasurableElement | null | undefined): number {
  if (!element) return 0;
  return Math.max(element.scrollHeight ?? 0, element.getBoundingClientRect?.().height ?? 0);
}

function measureLandingHeight(deps: ResizeMessengerDeps): number {
  const root = deps.document.querySelector('#root') as MeasurableElement | null;
  const page = deps.document.querySelector('.leaderboard2') as MeasurableElement | null;

  return Math.ceil(
    Math.max(
      deps.window.innerHeight,
      getElementHeight(deps.document.documentElement),
      getElementHeight(deps.document.body),
      getElementHeight(root),
      getElementHeight(page)
    )
  );
}

export function createRunningChallengeResizeMessenger(deps: ResizeMessengerDeps) {
  const sendHeight = () => {
    const height = measureLandingHeight(deps);
    if (deps.window.parent === deps.window) return height;

    const postMessage = deps.window.parent.postMessage;
    if (typeof postMessage !== 'function') return height;

    postMessage.call(
      deps.window.parent,
      {
        type: RUNNING_CHALLENGE_RESIZE_MESSAGE,
        height,
      },
      RUNNING_CHALLENGE_PARENT_ORIGIN
    );

    return height;
  };

  const start = () => {
    let frame = 0;
    let stopped = false;
    const timers: number[] = [];

    const scheduleSend = () => {
      if (stopped) return;
      deps.window.cancelAnimationFrame?.(frame);
      frame = deps.window.requestAnimationFrame?.(sendHeight) ?? 0;
      if (!frame) sendHeight();
    };

    const scheduleDelayedSend = (delay: number) => {
      const timer = deps.window.setTimeout?.(scheduleSend, delay);
      if (timer) timers.push(timer);
    };

    scheduleSend();
    scheduleDelayedSend(0);
    scheduleDelayedSend(250);
    scheduleDelayedSend(1_000);

    deps.window.addEventListener?.('load', scheduleSend);
    deps.window.addEventListener?.('resize', scheduleSend);
    deps.window.addEventListener?.('orientationchange', scheduleSend);

    const observedElements = [
      deps.document.documentElement,
      deps.document.body,
      deps.document.querySelector('#root'),
      deps.document.querySelector('.leaderboard2'),
    ].filter((element): element is Element => typeof Element !== 'undefined' && element instanceof Element);

    const resizeObserver = deps.window.ResizeObserver ? new deps.window.ResizeObserver(scheduleSend) : null;
    observedElements.forEach((element) => resizeObserver?.observe(element));

    const mutationObserver =
      deps.window.MutationObserver && typeof Element !== 'undefined'
        ? new deps.window.MutationObserver(scheduleSend)
        : null;
    observedElements.forEach((element) => {
      mutationObserver?.observe(element, { attributes: true, childList: true, subtree: true });
    });

    deps.document.fonts?.ready.then(scheduleSend).catch(() => undefined);

    return () => {
      stopped = true;
      deps.window.cancelAnimationFrame?.(frame);
      timers.forEach((timer) => deps.window.clearTimeout?.(timer));
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      deps.window.removeEventListener?.('load', scheduleSend);
      deps.window.removeEventListener?.('resize', scheduleSend);
      deps.window.removeEventListener?.('orientationchange', scheduleSend);
    };
  };

  return { sendHeight, start };
}

export function installRunningChallengeResizeMessenger() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  return createRunningChallengeResizeMessenger({ window, document }).start();
}
