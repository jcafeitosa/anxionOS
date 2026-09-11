import { createHash } from "node:crypto";
import type {
	BacktestRunnerInput,
	BacktestRunnerPort,
	BacktestRunnerResult,
} from "../../domain/ports/backtest-runner-port";

export interface SandboxBacktestRunnerOptions {
	forceFailure?: boolean;
}

function buildMetricsHash(input: BacktestRunnerInput): string {
	return createHash("sha256")
		.update(
			[
				input.backtestRunId,
				input.datasetId,
				input.datasetRevision,
				input.seed,
			].join(":"),
		)
		.digest("hex");
}

export function createSandboxBacktestRunnerAdapter(
	options: SandboxBacktestRunnerOptions = {},
): BacktestRunnerPort {
	return {
		async run(input: BacktestRunnerInput): Promise<BacktestRunnerResult> {
			if (options.forceFailure) {
				return {
					status: "FAILED",
					resultRef: null,
					metricsHash: null,
				};
			}
			return {
				status: "COMPLETED",
				resultRef: `sandbox://backtest/${input.backtestRunId}`,
				metricsHash: buildMetricsHash(input),
			};
		},
	};
}
