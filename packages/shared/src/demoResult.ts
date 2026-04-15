import type { RunTypeId } from './constants/runTypes.js';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

/** Mulberry32 PRNG */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Deterministic fake treadmill metrics per run type (seed with runSessionId so values vary between runs).
 * - max_5_min: fixed 300s, distance ~700–1800 m
 * - golden_km: fixed 1000 m, time ~180–420 s
 * - stayer 5km: fixed 5000 m, time ~900–2400 s
 */
export function generateDemoMetrics(runTypeId: RunTypeId, seed: string): { resultTime: number; distance: number } {
  const rng = mulberry32(hashSeed(seed));
  const next = () => rng();

  switch (runTypeId) {
    case 0: {
      const distance = 700 + next() * (1800 - 700);
      return { resultTime: 300, distance: round1(distance) };
    }
    case 1: {
      const resultTime = 180 + next() * (420 - 180);
      return { resultTime: round1(resultTime), distance: 1000 };
    }
    case 2: {
      const resultTime = 900 + next() * (2400 - 900);
      return { resultTime: round1(resultTime), distance: 5000 };
    }
    default:
      return { resultTime: 300, distance: 1000 };
  }
}
