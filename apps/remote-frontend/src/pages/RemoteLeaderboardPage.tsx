import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CAROUSEL_ORDER,
  LeaderboardExperience,
  type SlideState,
} from '@local-fe/features/leaderboard/LeaderboardExperience';

type LeaderboardDataOk =
  | {
      ok: true;
      empty: true;
      lastBackupAt: string | null;
      message?: string;
      scopes: [];
    }
  | {
      ok: true;
      empty: false;
      lastBackupAt: string | null;
      scopes: Array<{ leaderboard: SlideState['entries'] }>;
    };

const POLL_MS = 45_000;

export function RemoteLeaderboardView({
  embed = false,
  hideEmbedBrand = false,
  embedSearchPlacement = 'above-tabs',
  embedSearchPlaceholder,
  hideEmbedSearchOnNarrow = false,
  onEntryCountChange,
}: {
  embed?: boolean;
  hideEmbedBrand?: boolean;
  embedSearchPlacement?: 'above-tabs' | 'below-tabs' | 'stack-top';
  embedSearchPlaceholder?: string;
  hideEmbedSearchOnNarrow?: boolean;
  onEntryCountChange?: (count: number) => void;
}) {
  const [backupUnavailableMessage, setBackupUnavailableMessage] = useState<string | null>(null);

  const fetchAllSlides = useCallback(async (): Promise<SlideState[]> => {
    const res = await fetch('/api/remote/leaderboard-data');
    const data = (await res.json()) as LeaderboardDataOk | { ok: false; error?: string };
    if (!res.ok || !data || typeof data !== 'object' || data.ok !== true) {
      const err = (data as { error?: string })?.error ?? `HTTP ${res.status}`;
      setBackupUnavailableMessage(null);
      throw new Error(err);
    }
    if (data.empty) {
      setBackupUnavailableMessage(data.message ?? 'Данные пока недоступны');
      onEntryCountChange?.(0);
      return CAROUSEL_ORDER.map(() => ({ loading: false, error: null, entries: [] }));
    }
    setBackupUnavailableMessage(null);
    onEntryCountChange?.(
      data.scopes.reduce((sum, scope) => sum + scope.leaderboard.length, 0)
    );
    return data.scopes.map((s) => ({
      loading: false,
      error: null,
      entries: s.leaderboard,
    }));
  }, [onEntryCountChange]);

  return (
    <LeaderboardExperience
      showHomeLink={false}
      enableRunSessionUrlHighlight={false}
      enableInactivityReset={false}
      fetchAllSlides={fetchAllSlides}
      pollIntervalMs={POLL_MS}
      backupUnavailableMessage={backupUnavailableMessage}
      layoutMode={embed ? 'embed' : 'desktop'}
      hideEmbedBrand={hideEmbedBrand}
      embedSearchPlacement={embedSearchPlacement}
      embedSearchPlaceholder={embedSearchPlaceholder}
      hideEmbedSearchOnNarrow={hideEmbedSearchOnNarrow}
    />
  );
}

export default function RemoteLeaderboardPage() {
  const [searchParams] = useSearchParams();
  return <RemoteLeaderboardView embed={searchParams.get('embed') === '1'} />;
}
