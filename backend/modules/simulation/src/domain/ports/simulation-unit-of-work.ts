import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { sandboxIsolationFlagsSchema } from "@anxionos/contracts/simulation";
import type { z } from "zod";
import type { CommandJournalRepository } from "./command-journal";

type SandboxIsolationFlags = z.infer<typeof sandboxIsolationFlagsSchema>;

export interface SimulationManifestRecord {
	id: string;
	organizationId: string;
	fidelityTier: string;
	datasetHash: string;
	sandboxPolicy: Record<string, unknown>;
	manifestPayload: Record<string, unknown> | null;
}

export interface SimulationRunRecord {
	id: string;
	organizationId: string;
	manifestId: string | null;
	strategyId: string | null;
	strategyVersionId: string | null;
	backtestRequestId: string | null;
	executionMode: string;
	status: string;
	scenarioLabel: string | null;
	isolationFlags: SandboxIsolationFlags;
	seedHash: string | null;
	resultRef: string | null;
	revision: number;
	startedAt: string;
	completedAt: string | null;
	failedAt: string | null;
	failureCode: string | null;
}

export interface SimulationSnapshotRecord {
	id: string;
	organizationId: string;
	simulationRunId: string;
	datasetRef: string | null;
	datasetHash: string;
	snapshotPayload: Record<string, unknown> | null;
}

export interface SimulationManifestRepository {
	save(record: SimulationManifestRecord): Promise<SimulationManifestRecord>;
	findByOrganizationAndId(
		organizationId: string,
		id: string,
	): Promise<SimulationManifestRecord | null>;
}

export interface ListSimulationRunsFilter {
	status?: string;
	backtestRequestId?: string;
	strategyId?: string;
	limit?: number;
}

export interface SimulationRunRepository {
	save(record: SimulationRunRecord): Promise<SimulationRunRecord>;
	update(record: SimulationRunRecord): Promise<SimulationRunRecord>;
	findById(id: string): Promise<SimulationRunRecord | null>;
	findByOrganizationAndId(
		organizationId: string,
		id: string,
	): Promise<SimulationRunRecord | null>;
	findByOrganizationAndBacktestRequestId(
		organizationId: string,
		backtestRequestId: string,
	): Promise<SimulationRunRecord | null>;
	listByOrganizationId(
		organizationId: string,
		filter?: ListSimulationRunsFilter,
	): Promise<SimulationRunRecord[]>;
}

export interface SimulationSnapshotRepository {
	save(record: SimulationSnapshotRecord): Promise<SimulationSnapshotRecord>;
	findByOrganizationAndRunId(
		organizationId: string,
		simulationRunId: string,
	): Promise<SimulationSnapshotRecord | null>;
}

export interface SimulationTransactionContext {
	commandJournal: CommandJournalRepository;
	manifests: SimulationManifestRepository;
	runs: SimulationRunRepository;
	snapshots: SimulationSnapshotRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface SimulationUnitOfWork {
	runInTransaction<T>(
		work: (ctx: SimulationTransactionContext) => Promise<T>,
	): Promise<T>;
}
