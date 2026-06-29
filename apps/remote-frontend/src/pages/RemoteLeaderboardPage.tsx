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

function normalizeParticipantName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function uniqueParticipantCount(scopes: Array<{ leaderboard: SlideState['entries'] }>): number {
  const keys = new Set<string>();
  for (const scope of scopes) {
    for (const entry of scope.leaderboard) {
      const participantId = entry.participantId.trim();
      if (participantId) {
        keys.add(`id:${participantId}`);
        continue;
      }
      const participantName = normalizeParticipantName(entry.participantName);
      if (participantName) keys.add(`name:${participantName}`);
    }
  }
  return keys.size;
}

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
    onEntryCountChange?.(uniqueParticipantCount(data.scopes));
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
