import { useState, useEffect } from 'react';
import { api } from '../api/client';

export interface LeaderboardEntry {
  participantId: string;
  participantName: string;
  resultTime: number;
  distance: number;
  speed: number;
  runId: string;
  createdAt: string;
}

/** Simulated network delay (ms) when using fake data */
const FAKE_FETCH_MS = 1000;

/** Dev: fake data + delay. Override: `VITE_USE_FAKE_LEADERBOARD=true` in .env */
const useFakeLeaderboard =
  import.meta.env.DEV || import.meta.env.VITE_USE_FAKE_LEADERBOARD === 'true';

const FAKE_ENTRIES: LeaderboardEntry[] = [
  {
    participantId: 'fake-1',
    participantName: 'АЛЕКСЕЙ ИВАНОВСКИЙ',
    resultTime: 312.4,
    distance: 1000,
    speed: 3.2,
    runId: 'fake-run-1',
    createdAt: new Date().toISOString(),
  },
  {
    participantId: 'fake-2',
    participantName: 'НИКОЛАЙ ПЕТРОВ',
    resultTime: 325.1,
    distance: 1000,
    speed: 3.08,
    runId: 'fake-run-2',
    createdAt: new Date().toISOString(),
  },
  {
    participantId: 'fake-3',
    participantName: 'АНАСТАСИЯ ИВАНОВА',
    resultTime: 341.0,
    distance: 1000,
    speed: 2.93,
    runId: 'fake-run-3',
    createdAt: new Date().toISOString(),
  },
  {
    participantId: 'fake-4',
    participantName: 'ДМИТРИЙ К.',
    resultTime: 355.8,
    distance: 1000,
    speed: 2.81,
    runId: 'fake-run-4',
    createdAt: new Date().toISOString(),
  },
  {
    participantId: 'fake-5',
    participantName: 'ЕЛЕНА СМИРНОВА',
    resultTime: 368.2,
    distance: 1000,
    speed: 2.71,
    runId: 'fake-run-5',
    createdAt: new Date().toISOString(),
  },
  {
    participantId: 'fake-6',
    participantName: 'ИГОРЬ ВОЛКОВ',
    resultTime: 390.5,
    distance: 1000,
    speed: 2.56,
    runId: 'fake-run-6',
    createdAt: new Date().toISOString(),
  },
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        if (useFakeLeaderboard) {
          await delay(FAKE_FETCH_MS);
          if (!cancelled) {
            setEntries([...FAKE_ENTRIES]);
          }
          return;
        }

        const data = await api.getLeaderboard();
        if (!cancelled) {
          setEntries(data.leaderboard);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading, error };
}
