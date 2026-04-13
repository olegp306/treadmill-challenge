import { useState, useEffect } from 'react';
import type { RunType } from '@treadmill-challenge/shared';
import { api } from '../api/client';

export interface QueueEntry {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
}

export function useQueue(runType: RunType | null) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runType) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!runType) return;
      setLoading(true);
      setError(null);
      try {
        const data = await api.getRunQueue(runType);
        if (!cancelled) {
          setEntries(data.entries);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load queue');
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
  }, [runType]);

  return { entries, loading, error };
}
