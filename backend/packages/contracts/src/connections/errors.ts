import { z } from "zod";
export const CONNECTIONS_ERROR_CODES = [
    "CX_BINDING_NOT_FOUND",
    "CX_BINDING_REVOKED",
    "CX_GRANT_INVALID",
    "CX_EPOCH_STALE",
    "CX_CONNECTION_KIND_NOT_SUPPORTED",
    "CX_EFFECT_CLASS_DENIED",
    "CX_QUOTA_EXCEEDED",
    "CX_SECRET_GENERATION_STALE",
    "CX_ADAPTER_UNAVAILABLE",
    "CX_INFERENCE_TIMEOUT",
    "CX_IDEMPOTENT_REPLAY",
    "CX_REVISION_CONFLICT",
    "CX_SCOPE_DENIED",
    "CX_CROSS_TENANT",
] as const;
export const connectionsErrorCodeSchema = z.enum(CONNECTIONS_ERROR_CODES);
export const CONNECTIONS_ERROR_STATUS_MAP = {
    CX_BINDING_NOT_FOUND: 404,
    CX_BINDING_REVOKED: 409,
    CX_GRANT_INVALID: 403,
    CX_EPOCH_STALE: 409,
    CX_CONNECTION_KIND_NOT_SUPPORTED: 400,
    CX_EFFECT_CLASS_DENIED: 400,
    CX_QUOTA_EXCEEDED: 429,
    CX_SECRET_GENERATION_STALE: 409,
    CX_ADAPTER_UNAVAILABLE: 503,
    CX_INFERENCE_TIMEOUT: 504,
    CX_IDEMPOTENT_REPLAY: 200,
    CX_REVISION_CONFLICT: 409,
    CX_SCOPE_DENIED: 403,
    CX_CROSS_TENANT: 403,
};
export const connectionsErrorDetailsSchema = z.object({
    code: connectionsErrorCodeSchema,
    message: z.string().optional(),
    retryAfter: z.number().int().nonnegative().optional(),
});
export type ConnectionsErrorCode = (typeof CONNECTIONS_ERROR_CODES)[number];
export function resolveConnectionsErrorStatus(code: ConnectionsErrorCode): number {
    return CONNECTIONS_ERROR_STATUS_MAP[code as keyof typeof CONNECTIONS_ERROR_STATUS_MAP];
}

export type ConnectionsErrorDetails = z.infer<typeof connectionsErrorDetailsSchema>;
