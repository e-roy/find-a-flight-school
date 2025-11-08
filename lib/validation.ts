import { z } from "zod";
import { FACT_KEYS, PROGRAM_TYPES, COST_BANDS, type FactValue } from "@/types";

export const SeedRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.union([z.string().url(), z.literal("")]).optional(),
});

export type SeedRow = z.infer<typeof SeedRowSchema>;

export const ResolveQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const CrawlEnqueueQuerySchema = z.object({
  school_id: z.string().min(1, "school_id is required"),
});

export const CrawlWorkerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const NormalizeRunQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const RefreshRunQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// Claim schemas
export const ClaimRequestSchema = z.object({
  schoolId: z.string().min(1, "schoolId is required"),
  email: z.string().email("Invalid email address"),
});

export type ClaimRequest = z.infer<typeof ClaimRequestSchema>;

export const ClaimVerifySchema = z.object({
  token: z.string().min(1, "token is required"),
});

export type ClaimVerify = z.infer<typeof ClaimVerifySchema>;

// Fact value schema for editing
const FactValueSchema: z.ZodType<FactValue> = z.union([
  z.enum([
    PROGRAM_TYPES.PPL,
    PROGRAM_TYPES.IR,
    PROGRAM_TYPES.CPL,
    PROGRAM_TYPES.CFI,
    PROGRAM_TYPES.CFII,
    PROGRAM_TYPES.ME,
  ]),
  z.enum([COST_BANDS.LOW, COST_BANDS.MID, COST_BANDS.HIGH]),
  z.string(),
  z.array(z.string()),
  z.number(),
  z.null(),
]);

// Editable fact keys
const EditableFactKeySchema = z.enum([
  FACT_KEYS.CONTACT_EMAIL,
  FACT_KEYS.CONTACT_PHONE,
  FACT_KEYS.PROGRAM_TYPE,
  FACT_KEYS.FLEET_AIRCRAFT,
  FACT_KEYS.FLEET_COUNT,
  FACT_KEYS.COST_BAND,
]);

export const ClaimEditFactSchema = z.object({
  factKey: EditableFactKeySchema,
  factValue: FactValueSchema,
});

export const ClaimEditSchema = z.object({
  schoolId: z.string().min(1, "schoolId is required"),
  facts: z.array(ClaimEditFactSchema).min(1, "At least one fact is required"),
});

export type ClaimEdit = z.infer<typeof ClaimEditSchema>;
export type ClaimEditFact = z.infer<typeof ClaimEditFactSchema>;

// Signals mock schemas
export const SignalsMockCreateSchema = z.object({
  schoolId: z.string().uuid("Invalid school ID"),
  trainingVelocity: z.number().min(0).max(1).nullable().optional(),
  scheduleReliability: z.number().min(0).max(1).nullable().optional(),
  safetyNotes: z.string().nullable().optional(),
});

export type SignalsMockCreate = z.infer<typeof SignalsMockCreateSchema>;

export const SignalsMockUpdateSchema = z.object({
  schoolId: z.string().uuid("Invalid school ID"),
  trainingVelocity: z.number().min(0).max(1).nullable().optional(),
  scheduleReliability: z.number().min(0).max(1).nullable().optional(),
  safetyNotes: z.string().nullable().optional(),
});

export type SignalsMockUpdate = z.infer<typeof SignalsMockUpdateSchema>;

export const SignalsMockListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Match request schema
export const MatchRequestSchema = z.object({
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
  city: z.string().optional(),
  radiusKm: z.number().min(1).max(5000).default(100),
  programs: z
    .array(
      z.enum([
        PROGRAM_TYPES.PPL,
        PROGRAM_TYPES.IR,
        PROGRAM_TYPES.CPL,
        PROGRAM_TYPES.CFI,
        PROGRAM_TYPES.CFII,
        PROGRAM_TYPES.ME,
      ])
    )
    .optional(),
  budgetBand: z
    .enum([COST_BANDS.LOW, COST_BANDS.MID, COST_BANDS.HIGH])
    .optional(),
  aircraft: z.array(z.string()).optional(),
});

export type MatchRequest = z.infer<typeof MatchRequestSchema>;

// Financing intent schema
export const FinancingIntentSchema = z.object({
  schoolId: z.string().uuid("Invalid school ID"),
});

export type FinancingIntent = z.infer<typeof FinancingIntentSchema>;

// Lead creation schema
export const LeadCreateSchema = z.object({
  schoolId: z.string().uuid("Invalid school ID"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

export type LeadCreate = z.infer<typeof LeadCreateSchema>;
