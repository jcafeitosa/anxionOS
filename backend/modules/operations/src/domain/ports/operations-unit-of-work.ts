import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface HealthCheckRecord {
	id: string;
	organizationId: string;
	serviceId: string;
	status: string;
	probeDetails: Record<string, unknown> | null;
	checkedAt: string;
	revision: number;
}
export interface IncidentRecord {
	id: string;
	organizationId: string;
	title: string;
	description: string | null;
	severity: string;
	status: string;
	serviceId: string | null;
	openedAt: string;
	revision: number;
	runbookId: string | null;
	runbookVersion: string | null;
	runbookAttachedAt: string | null;
	responsiblePrincipalId: string | null;
	resolvedAt: string | null;
	closedAt: string | null;
}
export interface IncidentUpdateInput extends IncidentRecord {
	expectedRevision: number;
}
export interface HealthCheckUpdateInput extends HealthCheckRecord {
	expectedRevision: number;
}
export interface HealthCheckRepository {
	findByOrganizationAndServiceId(
		organizationId: string,
		serviceId: string,
	): Promise<HealthCheckRecord | null>;
	save(record: HealthCheckRecord): Promise<HealthCheckRecord>;
	update(record: HealthCheckUpdateInput): Promise<HealthCheckRecord>;
}
export interface IncidentRepository {
	findById(id: string): Promise<IncidentRecord | null>;
	save(record: IncidentRecord): Promise<IncidentRecord>;
	update(record: IncidentUpdateInput): Promise<IncidentRecord>;
}
export interface OperationsTransactionContext {
	commandJournal: CommandJournalRepository;
	healthChecks: HealthCheckRepository;
	incidents: IncidentRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface OperationsUnitOfWork {
	runInTransaction<T>(
		work: (ctx: OperationsTransactionContext) => Promise<T>,
	): Promise<T>;
}
