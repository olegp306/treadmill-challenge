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

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getLeaderboard()
      .then((data) => setEntries(data.leaderboard))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return { entries, loading, error };
}
