import { useCallback } from 'react';
import { api } from '../api/client';
import { CAROUSEL_ORDER, LeaderboardExperience } from '../features/leaderboard/LeaderboardExperience';

export default function LeaderboardPage() {
  const fetchAllSlides = useCallback(async () => {
    const settled = await Promise.allSettled(CAROUSEL_ORDER.map((scope) => api.getLeaderboard(scope)));
    return settled.map((r) => {
      if (r.status === 'fulfilled') {
        return {
          loading: false,
          error: null,
          entries: r.value.leaderboard,
        };
      }
      const msg = r.reason instanceof Error ? r.reason.message : 'Ошибка загрузки';
      return { loading: false, error: msg, entries: [] };
    });
  }, []);

  return (
    <LeaderboardExperience
      showHomeLink
      enableRunSessionUrlHighlight
      enableInactivityReset
      fetchAllSlides={fetchAllSlides}
      pollIntervalMs={0}
      backupUnavailableMessage={null}
    />
  );
}
