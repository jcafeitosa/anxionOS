import type { PoolClient } from "pg";
import type {
	AiAccountRecord,
	AiAccountRepository,
	ConnectionBindingRecord,
	ConnectionBindingRepository,
	InferenceRequestRecord,
	InferenceRequestRepository,
	UsageRecordRepository,
} from "../../domain/ports/connections-unit-of-work";

export function createPgAiAccountRepository(client: PoolClient): AiAccountRepository {
	return {
		async findDraftByNaturalKey(input) {
			const result = await client.query(
				`SELECT id, organization_id, owner_principal_id, provider_id, display_name, status, revision
				 FROM connections_ai_accounts
				 WHERE organization_id = $1 AND owner_principal_id = $2 AND provider_id = $3
				   AND display_name = $4 AND status = 'draft'`,
				[
					input.organizationId,
					input.ownerPrincipalId,
					input.providerId,
					input.displayName,
				],
			);
			const row = result.rows[0];
			if (!row) {
				return null;
			}
			return mapAiAccount(row);
		},
		async save(record: AiAccountRecord) {
			await client.query(
				`INSERT INTO connections_ai_accounts (
					id, organization_id, owner_principal_id, provider_id, display_name, status, revision
				) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.ownerPrincipalId,
					record.providerId,
					record.displayName,
					record.status,
					record.revision,
				],
			);
			return record;
		},
	};
}

export function createPgBindingRepository(
	client: PoolClient,
): ConnectionBindingRepository {
	return {
		async findActiveById(bindingId: string, organizationId: string) {
			const result = await client.query(
				`SELECT id, connection_id, binding_version, organization_id, ai_account_id, kind, environment,
				        adapter_id, status, revision, secret_id, secret_generation
				 FROM connections_connection_bindings
				 WHERE id = $1 AND organization_id = $2 AND status = 'active'`,
				[bindingId, organizationId],
			);
			const row = result.rows[0];
			if (!row) {
				return null;
			}
			return mapBinding(row);
		},
		async save(record: ConnectionBindingRecord) {
			await client.query(
				`INSERT INTO connections_connection_bindings (
					id, connection_id, binding_version, organization_id, ai_account_id, kind, environment,
					adapter_id, status, revision, secret_id, secret_generation, activated_at
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now())`,
				[
					record.id,
					record.connectionId,
					record.bindingVersion,
					record.organizationId,
					record.aiAccountId,
					record.kind,
					record.environment,
					record.adapterId,
					record.status,
					record.revision,
					record.secretId,
					record.secretGeneration,
				],
			);
			return record;
		},
	};
}

export function createPgInferenceRepository(
	client: PoolClient,
): InferenceRequestRepository {
	return {
		async findByIdempotencyKey(organizationId: string, idempotencyKey: string) {
			const result = await client.query(
				`SELECT id, organization_id, binding_id, binding_version, idempotency_key, operation, status, model_ref, latency_ms
				 FROM connections_inference_requests
				 WHERE organization_id = $1 AND idempotency_key = $2`,
				[organizationId, idempotencyKey],
			);
			const row = result.rows[0];
			if (!row) {
				return null;
			}
			return mapInference(row);
		},
		async save(record: InferenceRequestRecord) {
			await client.query(
				`INSERT INTO connections_inference_requests (
					id, organization_id, binding_id, binding_version, idempotency_key, operation, status, model_ref, latency_ms
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
				[
					record.id,
					record.organizationId,
					record.bindingId,
					record.bindingVersion,
					record.idempotencyKey,
					record.operation,
					record.status,
					record.modelRef,
					record.latencyMs,
				],
			);
			return record;
		},
		async update(record: InferenceRequestRecord) {
			await client.query(
				`UPDATE connections_inference_requests
				 SET status = $2, model_ref = $3, latency_ms = $4, completed_at = now()
				 WHERE id = $1`,
				[record.id, record.status, record.modelRef, record.latencyMs],
			);
			return record;
		},
	};
}

export function createPgUsageRepository(client: PoolClient): UsageRecordRepository {
	return {
		async save(record) {
			await client.query(
				`INSERT INTO connections_usage_records (
					id, organization_id, ai_account_id, connection_binding_id, binding_version,
					inference_request_id, consumer_kind, consumer_principal_id, operation, quantity, unit
				) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
				[
					record.id,
					record.organizationId,
					record.aiAccountId,
					record.connectionBindingId,
					record.bindingVersion,
					record.inferenceRequestId,
					record.consumerKind,
					record.consumerPrincipalId,
					record.operation,
					record.quantity,
					record.unit,
				],
			);
		},
	};
}

function mapAiAccount(row: Record<string, unknown>): AiAccountRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		ownerPrincipalId: String(row.owner_principal_id),
		providerId: String(row.provider_id),
		displayName: String(row.display_name),
		status: String(row.status),
		revision: Number(row.revision),
	};
}

function mapBinding(row: Record<string, unknown>): ConnectionBindingRecord {
	return {
		id: String(row.id),
		connectionId: String(row.connection_id),
		bindingVersion: Number(row.binding_version),
		organizationId: String(row.organization_id),
		aiAccountId: String(row.ai_account_id),
		kind: String(row.kind),
		environment: String(row.environment),
		adapterId: String(row.adapter_id),
		status: String(row.status),
		revision: Number(row.revision),
		secretId: String(row.secret_id),
		secretGeneration: Number(row.secret_generation),
	};
}

function mapInference(row: Record<string, unknown>): InferenceRequestRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		bindingId: String(row.binding_id),
		bindingVersion: Number(row.binding_version),
		idempotencyKey: String(row.idempotency_key),
		operation: String(row.operation),
		status: String(row.status),
		modelRef: row.model_ref ? String(row.model_ref) : null,
		latencyMs: row.latency_ms != null ? Number(row.latency_ms) : null,
	};
}
