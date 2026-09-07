import { z } from "zod";

/** Public contract schema version for API and event envelopes (P01). */
export const schemaVersion = "0.1.0" as const;

export const healthResponseSchema = z.object({
	status: z.literal("ok"),
	schemaVersion: z.literal(schemaVersion),
	service: z.string(),
	timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
