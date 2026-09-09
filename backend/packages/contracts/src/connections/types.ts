import { z } from "zod";
/** CX-R02-INV-01: REAL_EXECUTION absent by design */
export const connectionKindSchema = z.enum([
    "MARKET_DATA",
    "SIMULATION",
    "PAPER_ACCOUNT",
    "MODEL",
    "KNOWLEDGE",
    "TASKBOARD",
]);
export const connectionEnvironmentSchema = z.enum(["SIMULATED", "PAPER"]);
export const connectionBindingStatusSchema = z.enum([
    "DRAFT",
    "VALIDATING",
    "ACTIVE",
    "SUSPENDED",
    "REVOKED",
]);
/** CX-R02-INV-03: LIVE_TRADING absent */
export const connectionsEffectClassSchema = z.enum([
    "READ_ONLY",
    "SIMULATED_EFFECT",
    "PAPER_EFFECT",
    "INFERENCE",
    "SYNC_METADATA",
]);
export const consumerKindSchema = z.enum(["OWNER", "AGENCY", "PLATFORM"]);
export const connectionsSecretRefSchema = z
    .object({
    secretId: z.string().min(1).max(128),
    generation: z.number().int().nonnegative(),
})
    .strict();
export const grantRefSchema = z.object({
    grantId: z.string().uuid(),
    epoch: z.number().int().nonnegative(),
});
export const aiAccountIdSchema = z.string().min(1).max(64);
export const connectionBindingIdSchema = z.string().min(1).max(64);
export const connectionIdSchema = z.string().min(1).max(64);
export const usageRecordIdSchema = z.string().min(1).max(64);
export const inferenceRequestIdSchema = z.string().uuid();
const FORBIDDEN_CONNECTION_KINDS = ["REAL_EXECUTION"];
export class ConnectionsContractError extends Error {
    code;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "ConnectionsContractError";
    }
}
export function assertConnectionKindSupported(kind: string): z.infer<typeof connectionKindSchema> {
    if (FORBIDDEN_CONNECTION_KINDS.includes(kind)) {
        throw new ConnectionsContractError("CX_CONNECTION_KIND_NOT_SUPPORTED", `Connection kind not supported: ${kind}`);
    }
    return connectionKindSchema.parse(kind);
}

export type ConnectionKind = z.infer<typeof connectionKindSchema>;
export type ConnectionEnvironment = z.infer<typeof connectionEnvironmentSchema>;
export type ConnectionBindingStatus = z.infer<typeof connectionBindingStatusSchema>;
export type ConnectionsEffectClass = z.infer<typeof connectionsEffectClassSchema>;
export type ConsumerKind = z.infer<typeof consumerKindSchema>;
export type ConnectionsSecretRef = z.infer<typeof connectionsSecretRefSchema>;
export type GrantRef = z.infer<typeof grantRefSchema>;
