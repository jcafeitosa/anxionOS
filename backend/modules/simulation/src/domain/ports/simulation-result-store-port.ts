export interface SimulationResultStoreInput {
	organizationId: string;
	simulationRunId: string;
	metricsHash: string;
	payload: Record<string, unknown>;
}

export interface SimulationResultStorePort {
	put(input: SimulationResultStoreInput): Promise<{ resultRef: string }>;
}
