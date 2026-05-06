import { z } from 'zod';

const MAX_ERROR_COUNT = 20;
const MAX_ERROR_LEN = 500;

const errorArray = z
  .array(z.string().max(MAX_ERROR_LEN))
  .max(MAX_ERROR_COUNT)
  .default([])
  .catch([]);

const isoString = z.string().min(1);

export const HealthPayloadSchema = z.object({
  projectId: z.string().min(1).max(80),
  locationId: z.string().min(1).max(80),
  deviceId: z.string().min(1).max(80),
  timestamp: isoString,
  agent: z.object({
    version: z.string().min(1).max(40),
    startedAt: isoString,
    lastSuccessfulPostAt: isoString.optional().nullable().catch(null),
    errors: errorArray,
  }),
  pc: z.object({
    status: z.enum(['ok', 'warning', 'critical']).catch('ok'),
    cpu: z.number().min(0).max(100).nullable().optional().catch(null),
    ram: z.number().min(0).max(100).nullable().optional().catch(null),
    diskFreeGb: z.number().min(0).nullable().optional().catch(null),
    appRunning: z.boolean().nullable().optional().catch(null),
    internet: z.boolean().nullable().optional().catch(null),
    errors: errorArray,
  }),
  touchDesigner: z
    .object({
      fileExists: z.boolean().nullable().optional().catch(null),
      lastUpdatedAt: isoString.nullable().optional().catch(null),
      appRunning: z.boolean().nullable().optional().catch(null),
      projectLoaded: z.boolean().nullable().optional().catch(null),
      fps: z.number().min(0).max(500).nullable().optional().catch(null),
      cookTimeMs: z.number().min(0).max(60_000).nullable().optional().catch(null),
      kinectUpdating: z.boolean().nullable().optional().catch(null),
      outputAvailable: z.boolean().nullable().optional().catch(null),
      backendReachable: z.boolean().nullable().optional().catch(null),
      landingReachable: z.boolean().nullable().optional().catch(null),
      raceResultCreated: z.boolean().nullable().optional().catch(null),
      errors: errorArray,
    })
    .nullable()
    .optional(),
  ipad: z
    .object({
      ipadId: z.string().min(1).max(80),
      ip: z.string().min(1).max(80).nullable().optional().catch(null),
      online: z.boolean().nullable().optional().catch(null),
      lastSeen: isoString.nullable().optional().catch(null),
      battery: z.number().min(0).max(100).nullable().optional().catch(null),
      appActive: z.boolean().nullable().optional().catch(null),
      errors: errorArray,
    })
    .nullable()
    .optional(),
});

export type HealthPayload = z.infer<typeof HealthPayloadSchema>;

