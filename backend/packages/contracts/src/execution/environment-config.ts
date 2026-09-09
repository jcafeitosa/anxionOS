import { z } from "zod";
import { ENV_BOUNDARY_VIOLATION, ExecutionEnvironmentBoundaryError, assertAdapterAllowedForMode, executionAdapterDescriptorSchema, secretScopeSchema, } from "./environment";
import { executionModeSchema, } from "../decisions/types";
import type { ExecutionMode } from "../decisions/types";

export type ConfigLeakFinding = {
    code: (typeof ENV_BOUNDARY_VIOLATION)[keyof typeof ENV_BOUNDARY_VIOLATION];
    message: string;
};
export const secretRefSchema = z.object({
    secretRefId: z.string().uuid(),
    scope: secretScopeSchema,
    label: z.string().min(1),
});
export const environmentAccountSchema = z.object({
    accountId: z.string().uuid(),
    executionMode: executionModeSchema,
    venue: z.string().min(1),
    isProduction: z.boolean(),
});
export const executionEnvironmentConfigSchema = z.object({
    adapters: z.array(executionAdapterDescriptorSchema).min(1),
    secretRefs: z.array(secretRefSchema),
    accounts: z.array(environmentAccountSchema),
});
export const dispatchBundleSchema = z.object({
    adapterId: z.string().uuid(),
    secretRefId: z.string().uuid().optional(),
    accountId: z.string().uuid(),
});
const SECRET_SCOPE_BY_MODE: Record<
    ExecutionMode,
    readonly ("NONE" | "PAPER_SIM_ONLY" | "REAL_VENUE")[]
> = {
    SIMULATED: ["NONE", "PAPER_SIM_ONLY"],
    PAPER: ["NONE", "PAPER_SIM_ONLY"],
    REAL: ["NONE", "PAPER_SIM_ONLY", "REAL_VENUE"],
};
function findAdapter(config: ExecutionEnvironmentConfig, adapterId: string) {
    const adapter = config.adapters.find((a) => a.adapterId === adapterId);
    if (!adapter) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.ADAPTER_NOT_ALLOWED, `adapter ${adapterId} not registered`);
    }
    return adapter;
}
function findAccount(config: ExecutionEnvironmentConfig, accountId: string) {
    const account = config.accounts.find((a) => a.accountId === accountId);
    if (!account) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.PRODUCTION_ACCOUNT_DENIED, `account ${accountId} not registered`);
    }
    return account;
}
function findSecretRef(config: ExecutionEnvironmentConfig, secretRefId: string) {
    const secretRef = config.secretRefs.find((s) => s.secretRefId === secretRefId);
    if (!secretRef) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.PRODUCTION_SECRET_DENIED, `secret ref ${secretRefId} not registered`);
    }
    return secretRef;
}
/** Production accounts and REAL-mode accounts are unreachable from SIMULATED/PAPER. */
export function assertAccountAllowedForMode(mode: ExecutionMode, account: EnvironmentAccount): void {
    if (mode === "REAL") {
        return;
    }
    if (account.isProduction || account.executionMode === "REAL") {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.PRODUCTION_ACCOUNT_DENIED, `account ${account.accountId} is production-only`);
    }
    if (account.executionMode !== mode) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.MODE_MISMATCH, `account ${account.accountId} is bound to ${account.executionMode}, not ${mode}`);
    }
}
/** Secret refs with REAL_VENUE scope never resolve for SIMULATED/PAPER dispatch. */
export function assertSecretRefAllowedForMode(mode: ExecutionMode, secretRef: SecretRef): void {
    const allowed = SECRET_SCOPE_BY_MODE[mode];
    if (!allowed.includes(secretRef.scope)) {
        throw new ExecutionEnvironmentBoundaryError(ENV_BOUNDARY_VIOLATION.PRODUCTION_SECRET_DENIED, `secret scope ${secretRef.scope} denied for mode ${mode}`);
    }
}
/** Full dispatch bundle validation — negative proof entry point for boundary tests. */
export function assertDispatchBundleAllowed(mode: ExecutionMode, bundle: DispatchBundle, config: ExecutionEnvironmentConfig): void {
    const adapter = findAdapter(config, bundle.adapterId);
    assertAdapterAllowedForMode(mode, adapter);
    const account = findAccount(config, bundle.accountId);
    assertAccountAllowedForMode(mode, account);
    if (bundle.secretRefId) {
        const secretRef = findSecretRef(config, bundle.secretRefId);
        assertSecretRefAllowedForMode(mode, secretRef);
    }
}
/**
 * Static config review: detect adapters/accounts/secrets that would leak REAL
 * resources into SIMULATED/PAPER paths without runtime dispatch.
 */
export function scanEnvironmentConfigForLeaks(config: ExecutionEnvironmentConfig): ConfigLeakFinding[] {
    const findings = [];
    for (const adapter of config.adapters) {
        if (adapter.secretScope === "REAL_VENUE" &&
            (adapter.supportedModes.includes("SIMULATED") ||
                adapter.supportedModes.includes("PAPER"))) {
            findings.push({
                code: ENV_BOUNDARY_VIOLATION.CONFIG_CROSS_MODE_LEAK,
                message: `adapter ${adapter.adapterId} exposes REAL_VENUE to non-REAL modes`,
            });
        }
    }
    for (const account of config.accounts) {
        if (account.isProduction && account.executionMode !== "REAL") {
            findings.push({
                code: ENV_BOUNDARY_VIOLATION.CONFIG_CROSS_MODE_LEAK,
                message: `account ${account.accountId} is production but not REAL-bound`,
            });
        }
    }
    return findings;
}
export function parseExecutionEnvironmentConfig(input: unknown): ExecutionEnvironmentConfig {
    return executionEnvironmentConfigSchema.parse(input);
}

export type SecretRef = z.infer<typeof secretRefSchema>;
export type EnvironmentAccount = z.infer<typeof environmentAccountSchema>;
export type ExecutionEnvironmentConfig = z.infer<typeof executionEnvironmentConfigSchema>;
export type DispatchBundle = z.infer<typeof dispatchBundleSchema>;
