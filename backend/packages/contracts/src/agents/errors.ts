import { z } from "zod";

export const AGENTS_ERROR_CODES = [
	"AGT_AGENT_NOT_FOUND",
	"AGT_VERSION_NOT_FOUND",
	"AGT_SKILL_NOT_FOUND",
	"AGT_REVISION_CONFLICT",
	"AGT_STATUS_INVALID",
	"AGT_VERSION_IMMUTABLE",
	"AGT_TRAVERSAL_DENIED",
	"AGT_PRINCIPAL_NOT_FOUND",
	"AGT_RUNS_PENDING",
	"AGT_CAPABILITY_UNKNOWN",
	"AGT_IDEMPOTENT_REPLAY",
	"AGT_AUTONOMY_LEVEL_DISABLED",
] as const;

export const agentsErrorCodeSchema = z.enum(AGENTS_ERROR_CODES);

export const AGENTS_ERROR_STATUS_MAP = {
	AGT_AGENT_NOT_FOUND: 404,
	AGT_VERSION_NOT_FOUND: 404,
	AGT_SKILL_NOT_FOUND: 404,
	AGT_REVISION_CONFLICT: 409,
	AGT_STATUS_INVALID: 409,
	AGT_VERSION_IMMUTABLE: 409,
	AGT_TRAVERSAL_DENIED: 403,
	AGT_PRINCIPAL_NOT_FOUND: 404,
	AGT_RUNS_PENDING: 409,
	AGT_CAPABILITY_UNKNOWN: 400,
	AGT_IDEMPOTENT_REPLAY: 200,
	AGT_AUTONOMY_LEVEL_DISABLED: 403,
} as const;

export const agentsErrorDetailsSchema = z.object({
	code: agentsErrorCodeSchema,
	message: z.string().optional(),
});

export type AgentsErrorCode = (typeof AGENTS_ERROR_CODES)[number];
export type AgentsErrorDetails = z.infer<typeof agentsErrorDetailsSchema>;

export function resolveAgentsErrorStatus(code: AgentsErrorCode): number {
	return AGENTS_ERROR_STATUS_MAP[code as keyof typeof AGENTS_ERROR_STATUS_MAP];
}
