export const DEFAULT_GOD_ADMIN_PIN = '191181';
export const MANAGER_ADMIN_PIN = '332277';

const DISABLED_ADMIN_PINS = new Set(['5'.repeat(6)]);

function normalizePin(pin: string | undefined | null): string | null {
  const normalized = pin?.trim();
  return normalized ? normalized : null;
}

export function isDisabledAdminPin(pin: string): boolean {
  return DISABLED_ADMIN_PINS.has(pin.trim());
}

export function buildGodAdminPins(options: {
  envPin?: string | null;
  localBackendAuthToken?: string | null;
  configuredPin?: string | null;
}): Set<string> {
  const pins = new Set<string>([DEFAULT_GOD_ADMIN_PIN]);
  for (const pin of [options.envPin, options.localBackendAuthToken, options.configuredPin]) {
    const normalized = normalizePin(pin);
    if (normalized) pins.add(normalized);
  }
  for (const disabledPin of DISABLED_ADMIN_PINS) {
    pins.delete(disabledPin);
  }
  return pins;
}

export function getManagerPins(): Set<string> {
  return new Set<string>([MANAGER_ADMIN_PIN]);
}
