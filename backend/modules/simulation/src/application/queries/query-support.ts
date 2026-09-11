import type { SimulationRun } from "@anxionos/contracts/simulation";
import { simulationRunSchema } from "@anxionos/contracts/simulation";
import type { SimulationRunRecord } from "../../domain/ports/simulation-unit-of-work";

export function toSimulationRun(record: SimulationRunRecord): SimulationRun {
	return simulationRunSchema.parse({
		simulationRunId: record.id,
		organizationId: record.organizationId,
		manifestId: record.manifestId,
		strategyId: record.strategyId,
		strategyVersionId: record.strategyVersionId,
		backtestRequestId: record.backtestRequestId,
		executionMode: record.executionMode,
		status: record.status,
		scenarioLabel: record.scenarioLabel,
		isolationFlags: record.isolationFlags,
		seedHash: record.seedHash,
		resultRef: record.resultRef,
		revision: record.revision,
		startedAt: record.startedAt,
		completedAt: record.completedAt,
		failedAt: record.failedAt,
		failureCode: record.failureCode,
	});
}
