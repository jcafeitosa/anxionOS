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
	findByOrganizationAndId(
		organizationId: string,
		id: string,
	): Promise<IncidentRecord | null>;
	listByOrganizationId(organizationId: string): Promise<IncidentRecord[]>;
	save(record: IncidentRecord): Promise<IncidentRecord>;
	update(record: IncidentUpdateInput): Promise<IncidentRecord>;
}
export interface RecoveryTaskRecord {
	id: string;
	organizationId: string;
	incidentId: string;
	stepKind: string;
	status: string;
	stepRequiresApproval: boolean;
	hasRequiredApproval: boolean;
	startedAt: string;
	revision: number;
	initiatedByPrincipalId: string | null;
}
export interface RecoveryTaskUpdateInput extends RecoveryTaskRecord {
	expectedRevision: number;
}
export interface RecoveryTaskRepository {
	findById(id: string): Promise<RecoveryTaskRecord | null>;
	findByOrganizationAndId(
		organizationId: string,
		id: string,
	): Promise<RecoveryTaskRecord | null>;
	listByOrganizationAndIncidentId(
		organizationId: string,
		incidentId: string,
	): Promise<RecoveryTaskRecord[]>;
	save(record: RecoveryTaskRecord): Promise<RecoveryTaskRecord>;
	update(record: RecoveryTaskUpdateInput): Promise<RecoveryTaskRecord>;
}

/** ANX-313 S3 — retention policy */
export interface RetentionPolicyRecord {
	id: string;
	organizationId: string;
	scope: string;
	action: string;
	retentionDays: number;
	legalHold: boolean;
	exportManifestRequired: boolean;
	createdBy: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}
export interface RetentionPolicyRepository {
	findById(id: string): Promise<RetentionPolicyRecord | null>;
	findByOrganizationAndScope(organizationId: string, scope: string): Promise<RetentionPolicyRecord | null>;
	save(record: RetentionPolicyRecord): Promise<RetentionPolicyRecord>;
	updateStatus(id: string, status: string, revision: number): Promise<void>;
}
/** ANX-313 S3 — export job */
export interface ExportJobRecord {
	id: string;
	organizationId: string;
	scope: string;
	subjectId: string;
	status: string;
	manifestJson: Record<string, unknown> | null;
	requestedBy: string;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
export interface ExportJobRepository {
	findById(id: string): Promise<ExportJobRecord | null>;
	save(record: ExportJobRecord): Promise<ExportJobRecord>;
	updateStatus(id: string, status: string, manifestJson: Record<string, unknown> | null, completedAt: Date | null): Promise<void>;
}
/** ANX-313 S3 — deletion request */
export interface DeletionRequestRecord {
	id: string;
	organizationId: string;
	scope: string;
	subjectId: string;
	policyId: string;
	status: string;
	requestedBy: string;
	approvedBy: string | null;
	approvedAt: Date | null;
	executedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}
export interface DeletionRequestRepository {
	findById(id: string): Promise<DeletionRequestRecord | null>;
	findByOrganizationAndSubject(organizationId: string, subjectId: string): Promise<DeletionRequestRecord | null>;
	save(record: DeletionRequestRecord): Promise<DeletionRequestRecord>;
	updateStatus(id: string, status: string, approvedBy: string | null, executedAt: Date | null): Promise<void>;
}

export interface OperationsTransactionContext {
	commandJournal: CommandJournalRepository;
	healthChecks: HealthCheckRepository;
	incidents: IncidentRepository;
	recoveryTasks: RecoveryTaskRepository;
	retentionPolicies: RetentionPolicyRepository;
	exportJobs: ExportJobRepository;
	deletionRequests: DeletionRequestRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface OperationsUnitOfWork {
	runInTransaction<T>(
		work: (ctx: OperationsTransactionContext) => Promise<T>,
	): Promise<T>;
}
