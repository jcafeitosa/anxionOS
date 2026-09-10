import { z } from "zod";
export const GRAPH_ERROR_CODES = [
	"NODE_NOT_FOUND",
	"NODE_NOT_PROJECTED",
	"PROJECTION_TIMEOUT",
	"MERGE_CONFLICT",
	"TRAVERSAL_NOT_FOUND",
	"TRAVERSAL_INPUT_INVALID",
	"FORBIDDEN_SCOPE",
	"QUERY_LIMIT",
	"CURSOR_EXPIRED",
	"STALE_BASELINE",
	"GRAPH_UNAVAILABLE",
	"RATE_LIMITED",
] as const;
export const graphErrorCodeSchema = z.enum(GRAPH_ERROR_CODES);
export const GRAPH_ERROR_STATUS_MAP = {
	NODE_NOT_FOUND: 404,
	NODE_NOT_PROJECTED: 409,
	PROJECTION_TIMEOUT: 504,
	MERGE_CONFLICT: 409,
	TRAVERSAL_NOT_FOUND: 404,
	TRAVERSAL_INPUT_INVALID: 422,
	FORBIDDEN_SCOPE: 403,
	QUERY_LIMIT: 200,
	CURSOR_EXPIRED: 410,
	STALE_BASELINE: 409,
	GRAPH_UNAVAILABLE: 503,
	RATE_LIMITED: 429,
};
export const graphErrorDetailsSchema = z.object({
	code: graphErrorCodeSchema,
	message: z.string().optional(),
	details: z.unknown().optional(),
});
export type GraphErrorCode = (typeof GRAPH_ERROR_CODES)[number];
export function resolveGraphErrorStatus(code: GraphErrorCode): number {
	return GRAPH_ERROR_STATUS_MAP[code as keyof typeof GRAPH_ERROR_STATUS_MAP];
}

export type GraphErrorDetails = z.infer<typeof graphErrorDetailsSchema>;
