import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	SIMULATION_EVENT_TYPES,
	SIMULATION_OWNER_DOMAIN,
	sandboxIsolationFlagsSchema,
} from "@anxionos/contracts/simulation";
import type { z } from "zod";

type SandboxIsolationFlags = z.infer<typeof sandboxIsolationFlagsSchema>;

export function createSimulationRunStartedEvent(input: {
	simulationRunId: string;
	organizationId: string;
	strategyId?: string;
	strategyVersionId?: string;
	backtestRequestId?: string;
	executionMode: "SIMULATED";
	status: "STARTED";
	isolationFlags: SandboxIsolationFlags;
	scenarioLabel?: string;
	startedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: SIMULATION_EVENT_TYPES.RUN_STARTED,
		schemaVersion: "0.1.0",
		ownerDomain: SIMULATION_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createSimulationRunCompletedEvent(input: {
	simulationRunId: string;
	organizationId: string;
	resultRef: string;
	datasetHash: string;
	snapshotId: string;
	completedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: SIMULATION_EVENT_TYPES.RUN_COMPLETED,
		schemaVersion: "0.1.0",
		ownerDomain: SIMULATION_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: {
			schemaVersion: "1.0.0",
			...input,
		},
	};
}

export function createSimulationRunFailedEvent(input: {
	simulationRunId: string;
	organizationId: string;
	failureCode: string;
	failedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: SIMULATION_EVENT_TYPES.RUN_FAILED,
		schemaVersion: "0.1.0",
		ownerDomain: SIMULATION_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createSimulationSnapshotCreatedEvent(input: {
	simulationRunId: string;
	organizationId: string;
	snapshotId: string;
	createdAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: SIMULATION_EVENT_TYPES.SNAPSHOT_CREATED,
		schemaVersion: "0.1.0",
		ownerDomain: SIMULATION_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
