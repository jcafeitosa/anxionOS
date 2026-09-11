import { describe, expect, test } from "bun:test";
import {
	getRecoveryTask,
	listRecoveryTasksByIncident,
	OperationsCommandError,
} from "@anxionos/operations";
import {
	createInMemoryIncidentRepository,
	createInMemoryRecoveryTaskRepository,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrganizationId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const incidentId = "ops_inc_11111111-1111-4111-8111-111111111111";
const recoveryTaskId = "ops_rcv_22222222-2222-4222-8222-222222222222";
const otherRecoveryTaskId = "ops_rcv_33333333-3333-4333-8333-333333333333";

function seedRecoveryTask(
	overrides: Partial<{
		id: string;
		organizationId: string;
		incidentId: string;
		startedAt: string;
		status: string;
	}> = {},
) {
	return {
		id: recoveryTaskId,
		organizationId,
		incidentId,
		stepKind: "VALIDATE_SCHEMA",
		status: "PENDING",
		stepRequiresApproval: false,
		hasRequiredApproval: false,
		startedAt: "2026-09-10T14:00:00.000Z",
		revision: 1,
		initiatedByPrincipalId: null,
		...overrides,
	};
}

describe("recovery task queries (ANX-158 S4f)", () => {
	test("getRecoveryTask returns snapshot scoped to organization", async () => {
		const recoveryTasks = createInMemoryRecoveryTaskRepository([
			seedRecoveryTask(),
		]);
		const snapshot = await getRecoveryTask(
			{ recoveryTasks },
			organizationId,
			recoveryTaskId,
		);
		expect(snapshot).toMatchObject({
			recoveryTaskId,
			organizationId,
			incidentId,
			stepKind: "VALIDATE_SCHEMA",
			status: "PENDING",
			revision: 1,
		});
	});

	test("getRecoveryTask rejects cross-tenant lookup as not found", async () => {
		const recoveryTasks = createInMemoryRecoveryTaskRepository([
			seedRecoveryTask(),
		]);
		await expect(
			getRecoveryTask({ recoveryTasks }, otherOrganizationId, recoveryTaskId),
		).rejects.toBeInstanceOf(OperationsCommandError);
		await expect(
			getRecoveryTask({ recoveryTasks }, otherOrganizationId, recoveryTaskId),
		).rejects.toMatchObject({ code: "OPS_RECOVERY_TASK_NOT_FOUND" });
	});

	test("getRecoveryTask throws when task is missing", async () => {
		const recoveryTasks = createInMemoryRecoveryTaskRepository();
		await expect(
			getRecoveryTask({ recoveryTasks }, organizationId, recoveryTaskId),
		).rejects.toMatchObject({ code: "OPS_RECOVERY_TASK_NOT_FOUND" });
	});

	test("listRecoveryTasksByIncident returns tasks ordered by startedAt", async () => {
		const incidents = createInMemoryIncidentRepository([
			{
				id: incidentId,
				organizationId,
				title: "Database corruption detected",
				description: null,
				severity: "CRITICAL",
				status: "OPEN",
				serviceId: "postgres-primary",
				openedAt: "2026-09-10T12:00:00.000Z",
				revision: 1,
				runbookId: null,
				runbookVersion: null,
				runbookAttachedAt: null,
				responsiblePrincipalId: null,
				resolvedAt: null,
				closedAt: null,
			},
		]);
		const recoveryTasks = createInMemoryRecoveryTaskRepository([
			seedRecoveryTask({
				id: otherRecoveryTaskId,
				startedAt: "2026-09-10T15:00:00.000Z",
			}),
			seedRecoveryTask({ startedAt: "2026-09-10T14:00:00.000Z" }),
		]);
		const result = await listRecoveryTasksByIncident(
			{ incidents, recoveryTasks },
			organizationId,
			incidentId,
		);
		expect(result.recoveryTasks).toHaveLength(2);
		expect(result.recoveryTasks.map((task) => task.recoveryTaskId)).toEqual([
			recoveryTaskId,
			otherRecoveryTaskId,
		]);
	});

	test("listRecoveryTasksByIncident rejects cross-tenant incident access", async () => {
		const incidents = createInMemoryIncidentRepository([
			{
				id: incidentId,
				organizationId,
				title: "Database corruption detected",
				description: null,
				severity: "CRITICAL",
				status: "OPEN",
				serviceId: null,
				openedAt: "2026-09-10T12:00:00.000Z",
				revision: 1,
				runbookId: null,
				runbookVersion: null,
				runbookAttachedAt: null,
				responsiblePrincipalId: null,
				resolvedAt: null,
				closedAt: null,
			},
		]);
		const recoveryTasks = createInMemoryRecoveryTaskRepository();
		await expect(
			listRecoveryTasksByIncident(
				{ incidents, recoveryTasks },
				otherOrganizationId,
				incidentId,
			),
		).rejects.toMatchObject({ code: "OPS_CROSS_TENANT" });
	});

	test("listRecoveryTasksByIncident throws when incident is missing", async () => {
		const incidents = createInMemoryIncidentRepository();
		const recoveryTasks = createInMemoryRecoveryTaskRepository();
		await expect(
			listRecoveryTasksByIncident(
				{ incidents, recoveryTasks },
				organizationId,
				incidentId,
			),
		).rejects.toMatchObject({ code: "OPS_INCIDENT_NOT_FOUND" });
	});
});
