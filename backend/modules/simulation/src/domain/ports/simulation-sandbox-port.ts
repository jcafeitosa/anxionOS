export type SimulationSandboxStatus = "COMPLETED" | "FAILED";

export interface SimulationSandboxInput {
	simulationRunId: string;
	organizationId: string;
	seedHash: string | null;
	expectedDatasetHash: string;
	manifestPayload: Record<string, unknown> | null;
}

export interface SimulationSandboxResult {
	status: SimulationSandboxStatus;
	datasetHash: string;
	metricsHash: string | null;
	failureCode: string | null;
	resultPayload: Record<string, unknown> | null;
}

export interface SimulationSandboxPort {
	execute(input: SimulationSandboxInput): Promise<SimulationSandboxResult>;
}
