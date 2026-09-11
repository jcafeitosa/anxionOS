export type BacktestRunnerStatus = "COMPLETED" | "FAILED";

export interface BacktestRunnerInput {
	backtestRunId: string;
	organizationId: string;
	strategyId: string;
	strategyVersionId: string;
	datasetId: string;
	datasetRevision: string;
	seed: string;
}

export interface BacktestRunnerResult {
	status: BacktestRunnerStatus;
	resultRef: string | null;
	metricsHash: string | null;
}

export interface BacktestRunnerPort {
	run(input: BacktestRunnerInput): Promise<BacktestRunnerResult>;
}
