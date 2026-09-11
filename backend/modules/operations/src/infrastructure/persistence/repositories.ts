import type { Pool, PoolClient } from "pg";
import type {
	DeletionRequestRecord,
	DeletionRequestRepository,
	ExportJobRecord,
	ExportJobRepository,
	HealthCheckRecord,
	HealthCheckRepository,
	HealthCheckUpdateInput,
	IncidentRecord,
	IncidentRepository,
	IncidentUpdateInput,
	RecoveryTaskRecord,
	RecoveryTaskRepository,
	RecoveryTaskUpdateInput,
	RetentionPolicyRecord,
	RetentionPolicyRepository,
} from "../../domain/ports/operations-unit-of-work";
import { HealthCheckRevisionConflictError } from "../../domain/errors/health-check-errors";
import { IncidentRevisionConflictError } from "../../domain/errors/incident-errors";
import { RecoveryTaskRevisionConflictError } from "../../domain/errors/recovery-errors";

type PgQueryable = Pool | PoolClient;

function mapHealthCheck(row: Record<string, unknown>): HealthCheckRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		serviceId: String(row.service_id),
		status: String(row.status),
		probeDetails: (row.probe_details as Record<string, unknown> | null) ?? null,
		checkedAt: (row.checked_at as Date).toISOString(),
		revision: Number(row.revision),
	};
}
function mapIncident(row: Record<string, unknown>): IncidentRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		title: String(row.title),
		description: row.description ? String(row.description) : null,
		severity: String(row.severity),
		status: String(row.status),
		serviceId: row.service_id ? String(row.service_id) : null,
		openedAt: (row.opened_at as Date).toISOString(),
		revision: Number(row.revision ?? 1),
		runbookId: row.runbook_id ? String(row.runbook_id) : null,
		runbookVersion: row.runbook_version ? String(row.runbook_version) : null,
		runbookAttachedAt: row.runbook_attached_at
			? (row.runbook_attached_at as Date).toISOString()
			: null,
		responsiblePrincipalId: row.responsible_principal_id
			? String(row.responsible_principal_id)
			: null,
		resolvedAt: row.resolved_at
			? (row.resolved_at as Date).toISOString()
			: null,
		closedAt: row.closed_at ? (row.closed_at as Date).toISOString() : null,
	};
}
export function createPgHealthCheckRepository(
	client: PgQueryable,
): HealthCheckRepository {
	return {
		async findByOrganizationAndServiceId(organizationId, serviceId) {
			const result = await client.query(
				"SELECT * FROM operations_health_checks WHERE organization_id = $1 AND service_id = $2",
				[organizationId, serviceId],
			);
			const row = result.rows[0];
			return row ? mapHealthCheck(row) : null;
		},
		async save(record: HealthCheckRecord) {
			await client.query(
				`INSERT INTO operations_health_checks (
			   id, organization_id, service_id, status, probe_details, checked_at, revision
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.serviceId,
					record.status,
					record.probeDetails,
					record.checkedAt,
					record.revision,
				],
			);
			return record;
		},
		async update(record: HealthCheckUpdateInput) {
			const result = await client.query(
				`UPDATE operations_health_checks
			 SET status = $2, probe_details = $3, checked_at = $4, revision = $5, updated_at = now()
			 WHERE id = $1 AND revision = $6
			 RETURNING *`,
				[
					record.id,
					record.status,
					record.probeDetails,
					record.checkedAt,
					record.revision,
					record.expectedRevision,
				],
			);
			const row = result.rows[0];
			if (!row) {
				throw new HealthCheckRevisionConflictError();
			}
			return mapHealthCheck(row);
		},
	};
}
function mapRecoveryTask(row: Record<string, unknown>): RecoveryTaskRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		incidentId: String(row.incident_id),
		stepKind: String(row.step_kind),
		status: String(row.status),
		stepRequiresApproval: Boolean(row.step_requires_approval),
		hasRequiredApproval: Boolean(row.has_required_approval),
		startedAt: (row.started_at as Date).toISOString(),
		revision: Number(row.revision ?? 1),
		initiatedByPrincipalId: row.initiated_by_principal_id
			? String(row.initiated_by_principal_id)
			: null,
	};
}
export function createPgRecoveryTaskRepository(
	client: PgQueryable,
): RecoveryTaskRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM operations_recovery_tasks WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapRecoveryTask(row) : null;
		},
		async findByOrganizationAndId(organizationId, id) {
			const result = await client.query(
				"SELECT * FROM operations_recovery_tasks WHERE organization_id = $1 AND id = $2",
				[organizationId, id],
			);
			const row = result.rows[0];
			return row ? mapRecoveryTask(row) : null;
		},
		async listByOrganizationAndIncidentId(organizationId, incidentId) {
			const result = await client.query(
				`SELECT * FROM operations_recovery_tasks
				 WHERE organization_id = $1 AND incident_id = $2
				 ORDER BY started_at ASC`,
				[organizationId, incidentId],
			);
			return result.rows.map((row) => mapRecoveryTask(row));
		},
		async save(record: RecoveryTaskRecord) {
			await client.query(
				`INSERT INTO operations_recovery_tasks (
			   id, organization_id, incident_id, step_kind, status,
			   step_requires_approval, has_required_approval, started_at, revision,
			   initiated_by_principal_id
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.incidentId,
					record.stepKind,
					record.status,
					record.stepRequiresApproval,
					record.hasRequiredApproval,
					record.startedAt,
					record.revision,
					record.initiatedByPrincipalId,
				],
			);
			return record;
		},
		async update(record: RecoveryTaskUpdateInput) {
			const result = await client.query(
				`UPDATE operations_recovery_tasks
			 SET status = $2, has_required_approval = $3, revision = $4, updated_at = now()
			 WHERE id = $1 AND revision = $5
			 RETURNING *`,
				[
					record.id,
					record.status,
					record.hasRequiredApproval,
					record.revision,
					record.expectedRevision,
				],
			);
			const row = result.rows[0];
			if (!row) {
				throw new RecoveryTaskRevisionConflictError();
			}
			return mapRecoveryTask(row);
		},
	};
}
export function createPgIncidentRepository(
	client: PgQueryable,
): IncidentRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM operations_incidents WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapIncident(row) : null;
		},
		async findByOrganizationAndId(organizationId, id) {
			const result = await client.query(
				"SELECT * FROM operations_incidents WHERE organization_id = $1 AND id = $2",
				[organizationId, id],
			);
			const row = result.rows[0];
			return row ? mapIncident(row) : null;
		},
		async listByOrganizationId(organizationId) {
			const result = await client.query(
				`SELECT * FROM operations_incidents
				 WHERE organization_id = $1
				 ORDER BY opened_at DESC`,
				[organizationId],
			);
			return result.rows.map((row) => mapIncident(row));
		},
		async save(record: IncidentRecord) {
			await client.query(
				`INSERT INTO operations_incidents (
			   id, organization_id, title, description, severity, status, service_id, opened_at,
			   revision, runbook_id, runbook_version, runbook_attached_at,
			   responsible_principal_id, resolved_at, closed_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
				[
					record.id,
					record.organizationId,
					record.title,
					record.description,
					record.severity,
					record.status,
					record.serviceId,
					record.openedAt,
					record.revision,
					record.runbookId,
					record.runbookVersion,
					record.runbookAttachedAt,
					record.responsiblePrincipalId,
					record.resolvedAt,
					record.closedAt,
				],
			);
			return record;
		},
		async update(record: IncidentUpdateInput) {
			const result = await client.query(
				`UPDATE operations_incidents
			 SET status = $2, revision = $3, runbook_id = $4, runbook_version = $5,
			     runbook_attached_at = $6, responsible_principal_id = $7,
			     resolved_at = $8, closed_at = $9, updated_at = now()
			 WHERE id = $1 AND revision = $10
			 RETURNING *`,
				[
					record.id,
					record.status,
					record.revision,
					record.runbookId,
					record.runbookVersion,
					record.runbookAttachedAt,
					record.responsiblePrincipalId,
					record.resolvedAt,
					record.closedAt,
					record.expectedRevision,
				],
			);
			const row = result.rows[0];
			if (!row) {
				throw new IncidentRevisionConflictError();
			}
			return mapIncident(row);
		},
	};
}

// ANX-313 S3 — retention policy repository
export function createPgRetentionPolicyRepository(
	client: PgQueryable,
): RetentionPolicyRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM operations_retention_policies WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row
				? {
					id: row.id,
					organizationId: row.organization_id,
					scope: row.scope,
					action: row.action,
					retentionDays: row.retention_days,
					legalHold: row.legal_hold,
					exportManifestRequired: row.export_manifest_required,
					createdBy: row.created_by,
					status: row.status,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}
				: null;
		},
		async findByOrganizationAndScope(organizationId, scope) {
			const result = await client.query(
				"SELECT * FROM operations_retention_policies WHERE organization_id = $1 AND scope = $2 AND status = $3 LIMIT 1",
				[organizationId, scope, "ACTIVE"],
			);
			const row = result.rows[0];
			return row
				? {
					id: row.id,
					organizationId: row.organization_id,
					scope: row.scope,
					action: row.action,
					retentionDays: row.retention_days,
					legalHold: row.legal_hold,
					exportManifestRequired: row.export_manifest_required,
					createdBy: row.created_by,
					status: row.status,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}
				: null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO operations_retention_policies (
				   id, organization_id, scope, action, retention_days,
				   legal_hold, export_manifest_required, created_by, status
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.scope,
					record.action,
					record.retentionDays,
					record.legalHold,
					record.exportManifestRequired,
					record.createdBy,
					record.status,
				],
			);
			return record;
		},
		async updateStatus(id, status, _revision) {
			await client.query(
				"UPDATE operations_retention_policies SET status = $2, updated_at = NOW() WHERE id = $1",
				[id, status],
			);
		},
	};
}

// ANX-313 S3 — export job repository
export function createPgExportJobRepository(
	client: PgQueryable,
): ExportJobRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM operations_export_jobs WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row
				? {
					id: row.id,
					organizationId: row.organization_id,
					scope: row.scope,
					subjectId: row.subject_id,
					status: row.status,
					manifestJson: row.manifest_json,
					requestedBy: row.requested_by,
					completedAt: row.completed_at,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}
				: null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO operations_export_jobs (
				   id, organization_id, scope, subject_id, status,
				   manifest_json, requested_by
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.scope,
					record.subjectId,
					record.status,
					record.manifestJson ? JSON.stringify(record.manifestJson) : null,
					record.requestedBy,
				],
			);
			return record;
		},
		async updateStatus(id, status, manifestJson, completedAt) {
			await client.query(
				"UPDATE operations_export_jobs SET status = $2, manifest_json = $3, completed_at = $4, updated_at = NOW() WHERE id = $1",
				[id, status, manifestJson ? JSON.stringify(manifestJson) : null, completedAt],
			);
		},
	};
}

// ANX-313 S3 — deletion request repository
export function createPgDeletionRequestRepository(
	client: PgQueryable,
): DeletionRequestRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM operations_deletion_requests WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row
				? {
					id: row.id,
					organizationId: row.organization_id,
					scope: row.scope,
					subjectId: row.subject_id,
					policyId: row.policy_id,
					status: row.status,
					requestedBy: row.requested_by,
					approvedBy: row.approved_by,
					approvedAt: row.approved_at,
					executedAt: row.executed_at,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}
				: null;
		},
		async findByOrganizationAndSubject(organizationId, subjectId) {
			const result = await client.query(
				"SELECT * FROM operations_deletion_requests WHERE organization_id = $1 AND subject_id = $2 ORDER BY created_at DESC LIMIT 1",
				[organizationId, subjectId],
			);
			const row = result.rows[0];
			return row
				? {
					id: row.id,
					organizationId: row.organization_id,
					scope: row.scope,
					subjectId: row.subject_id,
					policyId: row.policy_id,
					status: row.status,
					requestedBy: row.requested_by,
					approvedBy: row.approved_by,
					approvedAt: row.approved_at,
					executedAt: row.executed_at,
					createdAt: row.created_at,
					updatedAt: row.updated_at,
				}
				: null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO operations_deletion_requests (
				   id, organization_id, scope, subject_id, policy_id,
				   status, requested_by, approved_by, executed_at
				 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.scope,
					record.subjectId,
					record.policyId,
					record.status,
					record.requestedBy,
					record.approvedBy,
					record.executedAt,
				],
			);
			return record;
		},
		async updateStatus(id, status, approvedBy, executedAt) {
			await client.query(
				"UPDATE operations_deletion_requests SET status = $2, approved_by = $3, executed_at = $4, updated_at = NOW() WHERE id = $1",
				[id, status, approvedBy, executedAt],
			);
		},
	};
}
