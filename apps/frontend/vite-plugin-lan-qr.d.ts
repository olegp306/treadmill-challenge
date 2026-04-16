import type { Plugin } from 'vite';
/** First non-internal IPv4 (typical Wi‑Fi / Ethernet on the LAN). */
export declare function getLanIPv4(): string | null;
export declare function lanQrPlugin(): Plugin;
