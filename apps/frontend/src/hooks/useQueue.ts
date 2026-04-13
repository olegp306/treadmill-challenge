import { useState, useEffect } from 'react';
import type { RunTypeId } from '@treadmill-challenge/shared';
import { api } from '../api/client';

export interface QueueEntry {
  runSessionId: string;
  queueNumber: number;
  participantId: string;
  participantName: string;
}

export function useQueue(runTypeId: RunTypeId | null) {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (runTypeId === null) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const filterRunTypeId = runTypeId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getRunQueue(filterRunTypeId);
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
  }, [runTypeId]);

  return { entries, loading, error };
}
