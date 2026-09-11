import { z } from "zod";

export {
	INSTITUTIONAL_UUID_PATTERN,
	institutionalUuidSchema,
	isInstitutionalUuid,
} from "./institutional-uuid";

/** Public contract schema version for API and event envelopes (P01). */
export const schemaVersion = "0.1.0";

export const healthDepStatusSchema = z.enum(["ok", "error"]);

export const healthDepsSchema = z.object({
	postgres: healthDepStatusSchema,
	nats: healthDepStatusSchema,
	neo4j: healthDepStatusSchema,
});

export const healthResponseSchema = z.object({
	status: z.literal("ok"),
	schemaVersion: z.literal(schemaVersion),
	service: z.string(),
	timestamp: z.string().datetime(),
	deps: healthDepsSchema,
});

export type HealthDepStatus = z.infer<typeof healthDepStatusSchema>;
export type HealthDeps = z.infer<typeof healthDepsSchema>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;
