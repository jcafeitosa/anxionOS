import { z } from "zod";
import { executionModeSchema, } from "../decisions/types";
import type { ExecutionMode } from "../decisions/types";
/** Secret/credential scope — REAL scopes never resolve for SIMULATED/PAPER dispatch. */
export const secretScopeSchema = z.enum([
    "NONE",
    "PAPER_SIM_ONLY",
    "REAL_VENUE",
]);
export const executionAdapterDescriptorSchema = z.object({
    adapterId: z.string().uuid(),
    name: z.string().min(1),
    supportedModes: z
        .array(executionModeSchema)
        .min(1)
        .refine((modes) => new Set(modes).size === modes.length, "supportedModes must be unique"),
    secretScope: secretScopeSchema,
    homologatedForReal: z.boolean(),
});
export const ENV_BOUNDARY_VIOLATION = {
    MODE_MISMATCH: "ENV_MODE_MISMATCH",
    ADAPTER_NOT_ALLOWED: "ENV_ADAPTER_NOT_ALLOWED",
    SECRET_SCOPE_DENIED: "ENV_SECRET_SCOPE_DENIED",
    SILENT_ESCALATION: "ENV_SILENT_ESCALATION",
    REAL_NOT_HOMOLOGATED: "ENV_REAL_NOT_HOMOLOGATED",
    PRODUCTION_ACCOUNT_DENIED: "ENV_PRODUCTION_ACCOUNT_DENIED",
    PRODUCTION_SECRET_DENIED: "ENV_PRODUCTION_SECRET_DENIED",
    CONFIG_CROSS_MODE_LEAK: "ENV_CONFIG_CROSS_MODE_LEAK",
};
export class ExecutionEnvironmentBoundaryError extends Error {
    code;
    constructor(code: string, message: string) {
        super(message);
        this.name = "ExecutionEnvironmentBoundaryError";
        this.code = code;
    }
}
const SECRET_SCOPE_BY_MODE = {
    SIMULATED: ["NONE", "PAPER_SIM_ONLY"],
    PAPER: ["NONE", "PAPER_SIM_ONLY"],
    REAL: ["NONE", "PAPER_SIM_ONLY", "REAL_VENUE"],
};
/** Returns whether adapter may be invoked for the given execution mode. */
export function isAdapterAllowedForMode(mode: ExecutionMode, adapter: ExecutionAdapterDescriptor): boolean {
    if (!adapter.supportedModes.includes(mode)) {
        return false;
    }
    if (mode === "REAL" && !adapter.homologatedForReal) {
        return false;
    }
    const allowedScopes = SECRET_SCOPE_BY_MODE[mode];
    return allowedScopes.includes(adapter.secretScope);
}
/** Throws when dispatch mode differs from immutable intent mode (no silent escalation). */
export function assertNoSilentModeEscalation(intentMode: ExecutionMode, dispatchMode: ExecutionMode): void {
    if (intentMode !== dispatchMode) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.SILENT_ESCALATION, `executionMode cannot change from ${intentMode} to ${dispatchMode}`);
    }
}
/** Enforce adapter + secret scope boundaries before venue dispatch. */
export function assertAdapterAllowedForMode(mode: ExecutionMode, adapter: ExecutionAdapterDescriptor): void {
    if (!adapter.supportedModes.includes(mode)) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.ADAPTER_NOT_ALLOWED, `adapter ${adapter.adapterId} does not support mode ${mode}`);
    }
    if (mode === "REAL" && !adapter.homologatedForReal) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.REAL_NOT_HOMOLOGATED, `adapter ${adapter.adapterId} is not homologated for REAL`);
    }
    const allowedScopes = SECRET_SCOPE_BY_MODE[mode];
    if (!allowedScopes.includes(adapter.secretScope)) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.SECRET_SCOPE_DENIED, `secret scope ${adapter.secretScope} denied for mode ${mode}`);
    }
}
export function parseExecutionAdapterDescriptor(input: unknown): ExecutionAdapterDescriptor {
    return executionAdapterDescriptorSchema.parse(input);
}

export type SecretScope = z.infer<typeof secretScopeSchema>;
export type ExecutionAdapterDescriptor = z.infer<typeof executionAdapterDescriptorSchema>;

export type EnvBoundaryViolation = (typeof ENV_BOUNDARY_VIOLATION)[keyof typeof ENV_BOUNDARY_VIOLATION];
