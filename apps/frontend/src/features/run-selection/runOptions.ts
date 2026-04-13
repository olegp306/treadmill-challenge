import { RUN_TYPES, type RunTypeId, type RunTypeKey } from '@treadmill-challenge/shared';

export type { RunType, RunTypeId, RunTypeKey } from '@treadmill-challenge/shared';

export interface RunOptionDefinition {
  runTypeId: RunTypeId;
  runType: RunTypeKey;
  title: string;
  description: string;
}

export const RUN_OPTIONS: RunOptionDefinition[] = RUN_TYPES.map((t) => ({
  runTypeId: t.id,
  runType: t.key,
  title: t.name,
  description: t.description,
}));

export function getRunOption(runTypeId: RunTypeId): RunOptionDefinition {
  return RUN_OPTIONS.find((o) => o.runTypeId === runTypeId) ?? RUN_OPTIONS[2];
}
