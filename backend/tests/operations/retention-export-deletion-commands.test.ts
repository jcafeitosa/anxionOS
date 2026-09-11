import { describe, expect, test } from "bun:test";
import { OPERATIONS_EVENT_TYPES } from "@anxionos/contracts/operations";
import {
	approveDeletion,
	createExportJob,
	registerRetentionPolicy,
	requestDeletion,
} from "@anxionos/operations";
import {
	createInMemoryCommandJournalRepository,
	createRecordingOperationsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createDeps() {
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork, published } = createRecordingOperationsUnitOfWork({
		commandJournal,
		healthChecks: {
			async findByOrganizationAndServiceId() {
				return null;
			},
			async save(record) {
				return record;
			},
			async update(record) {
				return record;
			},
		},
	});
	return { deps: { unitOfWork, commandJournal }, published };
}

describe("retention/export/deletion commands (ANX-313 S3)", () => {
	test("registerRetentionPolicy creates ACTIVE policy and emits event", async () => {
		const { deps, published } = createDeps();
		const result = await registerRetentionPolicy(deps, {
			commandId: "11111111-1111-4111-8111-111111111111",
			organizationId,
			scope: "INCIDENT",
			action: "EXPORT_THEN_PURGE",
			retentionDays: 90,
			legalHold: false,
			exportManifestRequired: true,
			createdBy: principalId,
		});
		expect(result.aggregateId).toMatch(/^ops_rpo_/);
		expect(result.revision).toBe(1);
		expect(published[0]?.eventType).toBe(
			OPERATIONS_EVENT_TYPES.RETENTION_POLICY_REGISTERED,
		);
	});

	test("registerRetentionPolicy is idempotent on replay", async () => {
		const { deps } = createDeps();
		const input = {
			commandId: "11111111-1111-4111-8111-111111111111",
			organizationId,
			scope: "HEALTH_CHECK",
			action: "PURGE",
			retentionDays: 30,
			legalHold: false,
			exportManifestRequired: false,
			createdBy: principalId,
		};
		const first = await registerRetentionPolicy(deps, input);
		const second = await registerRetentionPolicy(deps, input);
		expect(second.aggregateId).toBe(first.aggregateId);
		expect(second.idempotentReplay).toBe(true);
	});

	test("createExportJob creates REQUESTED job and emits event", async () => {
		const { deps, published } = createDeps();
		const result = await createExportJob(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			scope: "INCIDENT",
			subjectId: "ops_inc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			requestedBy: principalId,
		});
		expect(result.aggregateId).toMatch(/^ops_exp_/);
		expect(published[0]?.eventType).toBe(
			OPERATIONS_EVENT_TYPES.EXPORT_JOB_REQUESTED,
		);
	});

	test("requestDeletion requires a retention policy", async () => {
		const { deps } = createDeps();
		// No policy registered yet — should fail with OPS_RETENTION_POLICY_NOT_FOUND
		const promise = requestDeletion(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			organizationId,
			scope: "INCIDENT",
			subjectId: "ops_inc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			policyId: "ops_rpo_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			requestedBy: principalId,
		});
		await expect(promise).rejects.toMatchObject({
			code: "OPS_RETENTION_POLICY_NOT_FOUND",
		});
	});

	test("requestDeletion succeeds with policy and emits event", async () => {
		const { deps, published } = createDeps();
		await registerRetentionPolicy(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			organizationId,
			scope: "INCIDENT",
			action: "EXPORT_THEN_PURGE",
			retentionDays: 90,
			legalHold: false,
			exportManifestRequired: true,
			createdBy: principalId,
		});
		const result = await requestDeletion(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			organizationId,
			scope: "INCIDENT",
			subjectId: "ops_inc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			policyId: "ops_rpo_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			requestedBy: principalId,
		});
		expect(result.aggregateId).toMatch(/^ops_del_/);
		expect(published.at(-1)?.eventType).toBe(
			OPERATIONS_EVENT_TYPES.DELETION_REQUESTED,
		);
	});

	test("approveDeletion approves REQUESTED deletion", async () => {
		const { deps, published } = createDeps();
		await registerRetentionPolicy(deps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			organizationId,
			scope: "INCIDENT",
			action: "EXPORT_THEN_PURGE",
			retentionDays: 90,
			legalHold: false,
			exportManifestRequired: true,
			createdBy: principalId,
		});
		const created = await requestDeletion(deps, {
			commandId: "77777777-7777-4777-8777-777777777777",
			organizationId,
			scope: "INCIDENT",
			subjectId: "ops_inc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			policyId: "ops_rpo_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			requestedBy: principalId,
		});
		const approved = await approveDeletion(deps, {
			commandId: "88888888-8888-4888-8888-888888888888",
			organizationId,
			deletionRequestId: created.aggregateId,
			approvedBy: principalId,
		});
		expect(approved.revision).toBe(2);
		expect(published.at(-1)?.eventType).toBe(
			OPERATIONS_EVENT_TYPES.DELETION_APPROVED,
		);
	});

	test("approveDeletion rejects already-approved request", async () => {
		const { deps } = createDeps();
		await registerRetentionPolicy(deps, {
			commandId: "99999999-9999-4999-8999-999999999999",
			organizationId,
			scope: "INCIDENT",
			action: "EXPORT_THEN_PURGE",
			retentionDays: 90,
			legalHold: false,
			exportManifestRequired: true,
			createdBy: principalId,
		});
		const created = await requestDeletion(deps, {
			commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
			organizationId,
			scope: "INCIDENT",
			subjectId: "ops_inc_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			policyId: "ops_rpo_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
			requestedBy: principalId,
		});
		await approveDeletion(deps, {
			commandId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			organizationId,
			deletionRequestId: created.aggregateId,
			approvedBy: principalId,
		});
		const promise = approveDeletion(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			organizationId,
			deletionRequestId: created.aggregateId,
			approvedBy: principalId,
		});
		await expect(promise).rejects.toMatchObject({
			code: "OPS_DELETION_ALREADY_APPROVED",
		});
	});
});
