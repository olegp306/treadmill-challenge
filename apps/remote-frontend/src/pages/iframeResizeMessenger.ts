const RUNNING_CHALLENGE_PARENT_ORIGIN = 'https://amazingred.ru';
const RUNNING_CHALLENGE_RESIZE_MESSAGE = 'running-challenge:resize';
const RUNNING_CHALLENGE_SCROLL_MESSAGE = 'running-challenge:scroll';

type RunningChallengeParentMessage =
  | { type: typeof RUNNING_CHALLENGE_RESIZE_MESSAGE; height: number }
  | { type: typeof RUNNING_CHALLENGE_SCROLL_MESSAGE; deltaY: number };

type MeasurableElement = {
  scrollHeight?: number;
  getBoundingClientRect?: () => { height?: number };
};

type ResizeMessengerParent = {
  postMessage: (message: RunningChallengeParentMessage, targetOrigin: string) => void;
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
  referrer?: string;
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

export function isRunningChallengeAmazingRedEmbed(referrer: string | undefined): boolean {
  if (!referrer) return false;

  try {
    const { hostname } = new URL(referrer);
    return hostname === 'amazingred.ru' || hostname.endsWith('.amazingred.ru');
  } catch {
    return false;
  }
}

function measurePostedHeight(deps: ResizeMessengerDeps): number {
  return measureLandingHeight(deps);
}

function canElementScroll(element: Element | null | undefined, deltaY: number): boolean {
  if (!element || !('scrollHeight' in element)) return false;

  const overflowY = window.getComputedStyle(element).overflowY;
  if (!['auto', 'scroll', 'overlay'].includes(overflowY)) return false;

  const clientHeight = element.clientHeight;
  const scrollHeight = element.scrollHeight;
  const scrollTop = element.scrollTop;

  if (scrollHeight <= clientHeight + 1) return false;
  if (deltaY > 0) return scrollTop + clientHeight < scrollHeight - 1;
  if (deltaY < 0) return scrollTop > 1;
  return false;
}

function canRootScroll(deltaY: number, deps: ResizeMessengerDeps): boolean {
  const documentElement = deps.document.documentElement as Element & {
    clientHeight?: number;
    scrollHeight?: number;
    scrollTop?: number;
  };
  const body = deps.document.body as Element & {
    clientHeight?: number;
    scrollHeight?: number;
    scrollTop?: number;
  };

  const viewportHeight = Math.max(deps.window.innerHeight, documentElement.clientHeight ?? 0, body.clientHeight ?? 0);
  const scrollHeight = Math.max(documentElement.scrollHeight ?? 0, body.scrollHeight ?? 0);
  const scrollTop = Math.max(documentElement.scrollTop ?? 0, body.scrollTop ?? 0);

  if (scrollHeight <= viewportHeight + 1) return false;
  if (deltaY > 0) return scrollTop + viewportHeight < scrollHeight - 1;
  if (deltaY < 0) return scrollTop > 1;
  return false;
}

function canAnyLocalScrollerMove(target: EventTarget | null, deltaY: number, deps: ResizeMessengerDeps): boolean {
  if (typeof Element !== 'undefined' && target instanceof Element) {
    let node: Element | null = target;
    while (node) {
      if (node === deps.document.body || node === deps.document.documentElement) break;
      if (canElementScroll(node, deltaY)) return true;
      node = node.parentElement;
    }
  }

  return canRootScroll(deltaY, deps);
}

export function createRunningChallengeResizeMessenger(deps: ResizeMessengerDeps) {
  const isAmazingRedEmbed = isRunningChallengeAmazingRedEmbed(deps.document.referrer);

  const postParentMessage = (message: RunningChallengeParentMessage) => {
    if (deps.window.parent === deps.window) return false;

    const postMessage = deps.window.parent.postMessage;
    if (typeof postMessage !== 'function') return false;

    postMessage.call(deps.window.parent, message, RUNNING_CHALLENGE_PARENT_ORIGIN);
    return true;
  };

  const sendHeight = () => {
    const height = measurePostedHeight(deps);
    postParentMessage({
      type: RUNNING_CHALLENGE_RESIZE_MESSAGE,
      height,
    });

    return height;
  };

  const sendScroll = (deltaY: number) => {
    if (!isAmazingRedEmbed || !Number.isFinite(deltaY) || Math.abs(deltaY) < 1) return false;

    return postParentMessage({
      type: RUNNING_CHALLENGE_SCROLL_MESSAGE,
      deltaY,
    });
  };

  const start = () => {
    let frame = 0;
    let stopped = false;
    let lastTouchY: number | null = null;
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

    const handleWheel = (event: WheelEvent) => {
      if (canAnyLocalScrollerMove(event.target, event.deltaY, deps)) return;
      if (sendScroll(event.deltaY)) event.preventDefault();
    };

    const handleTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const nextTouchY = event.touches[0]?.clientY;
      if (lastTouchY === null || nextTouchY === undefined) {
        lastTouchY = nextTouchY ?? null;
        return;
      }

      const deltaY = lastTouchY - nextTouchY;
      lastTouchY = nextTouchY;
      if (canAnyLocalScrollerMove(event.target, deltaY, deps)) return;
      if (sendScroll(deltaY)) event.preventDefault();
    };

    const handleTouchEnd = () => {
      lastTouchY = null;
    };

    if (isAmazingRedEmbed) {
      deps.window.addEventListener?.('wheel', handleWheel as EventListener, { passive: false });
      deps.window.addEventListener?.('touchstart', handleTouchStart as EventListener, { passive: true });
      deps.window.addEventListener?.('touchmove', handleTouchMove as EventListener, { passive: false });
      deps.window.addEventListener?.('touchend', handleTouchEnd as EventListener);
      deps.window.addEventListener?.('touchcancel', handleTouchEnd as EventListener);
    }

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
      deps.window.removeEventListener?.('wheel', handleWheel as EventListener);
      deps.window.removeEventListener?.('touchstart', handleTouchStart as EventListener);
      deps.window.removeEventListener?.('touchmove', handleTouchMove as EventListener);
      deps.window.removeEventListener?.('touchend', handleTouchEnd as EventListener);
      deps.window.removeEventListener?.('touchcancel', handleTouchEnd as EventListener);
    };
  };

  return { sendHeight, sendScroll, start };
}

export function installRunningChallengeResizeMessenger() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;
  return createRunningChallengeResizeMessenger({ window, document }).start();
}
