import { z } from "zod";
export const SIMULATION_OWNER_DOMAIN = "simulation";
export const simulationRunIdSchema = z.string().regex(/^sim_run_[0-9a-f-]{36}$/i);
export const simulationBacktestRequestIdSchema = z.string().regex(/^st_btr_[0-9a-f-]{36}$/i);
export const simulationRunStatusSchema = z.enum(["STARTED", "COMPLETED", "FAILED"]);
export const simulationExecutionModeSchema = z.enum(["SIMULATED"]);
/** Sandbox isolation flags — always organizationId-scoped (SIM-R02-INV-02). */
export const sandboxIsolationFlagsSchema = z.object({
    sandboxIsolated: z.literal(true),
    promotionBlocked: z.literal(true),
    syntheticCredentialsOnly: z.literal(true),
    isolatedSubgraph: z.literal(true),
});
export const DEFAULT_SANDBOX_ISOLATION_FLAGS = {
    sandboxIsolated: true,
    promotionBlocked: true,
    syntheticCredentialsOnly: true,
    isolatedSubgraph: true,
};
export class SimulationContractError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SimulationContractError";
    }
}
export function assertSimulationExecutionModeSupported(mode: string): void {
    if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE" || mode === "PAPER") {
        throw new SimulationContractError("SIM_EXECUTION_MODE_NOT_SUPPORTED");
    }
    const parsed = simulationExecutionModeSchema.safeParse(mode);
    if (!parsed.success) {
        throw new SimulationContractError("SIM_EXECUTION_MODE_NOT_SUPPORTED");
    }
}

export type SimulationRunId = z.infer<typeof simulationRunIdSchema>;
export type SimulationBacktestRequestId = z.infer<typeof simulationBacktestRequestIdSchema>;
export type SimulationRunStatus = z.infer<typeof simulationRunStatusSchema>;
export type SimulationExecutionMode = z.infer<typeof simulationExecutionModeSchema>;
export type SandboxIsolationFlags = z.infer<typeof sandboxIsolationFlagsSchema>;
