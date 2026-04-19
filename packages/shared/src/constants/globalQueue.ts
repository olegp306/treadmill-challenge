/**
 * Single treadmill: max concurrent sessions in the global pool (queued + running).
 * Default used when admin_settings has no value (new installs / fallback).
 */
export const DEFAULT_MAX_GLOBAL_QUEUE_SIZE = 4;
