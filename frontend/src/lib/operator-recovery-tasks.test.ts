import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fetchIncidentRecoveryTasks,
	incidentRecoveryTasksCollectionUrl,
	recoveryTaskDisplayLabel,
	recoveryTaskEmptyDescription,
	recoveryTasksViewFromResponse,
	RECOVERY_TASKS_COLLECTION_CONTRACT,
	OPERATIONS_RECOVERY_TASKS_COLLECTION_PATH,
} from "./operator-recovery-tasks.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const INCIDENT_ID = "ops_inc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RECOVERY_TASK_ID = "ops_rcv_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const realRecoveryTask = {
	recoveryTaskId: RECOVERY_TASK_ID,
	organizationId: AGENCY_ID,
	incidentId: INCIDENT_ID,
	stepKind: "VERIFY_INTEGRITY" as const,
	status: "PENDING" as const,
	stepRequiresApproval: true,
	hasRequiredApproval: false,
	startedAt: "2026-01-01T00:00:00.000Z",
	revision: 1,
	initiatedByPrincipalId: null,
};

describe("incidentRecoveryTasksCollectionUrl", () => {
	it("encodes agencyId and incidentId on the public operations path", () => {
		assert.equal(
			incidentRecoveryTasksCollectionUrl(AGENCY_ID, INCIDENT_ID),
			`/v1/operations/agencies/${AGENCY_ID}/incidents/${INCIDENT_ID}/recovery-tasks`,
		);
		assert.match(OPERATIONS_RECOVERY_TASKS_COLLECTION_PATH, /recovery-tasks/);
	});
});

describe("recoveryTasksViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(
			recoveryTasksViewFromResponse(401, { recoveryTasks: [realRecoveryTask] }),
			{ kind: "denied", status: 401 },
		);
		assert.deepEqual(
			recoveryTasksViewFromResponse(403, { recoveryTasks: [realRecoveryTask] }),
			{ kind: "denied", status: 403 },
		);
	});

	it("maps 404/405 to empty collection_unavailable", () => {
		assert.deepEqual(recoveryTasksViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty to no_recovery_tasks", () => {
		assert.deepEqual(recoveryTasksViewFromResponse(200, { recoveryTasks: [] }), {
			kind: "empty",
			reason: "no_recovery_tasks",
			status: 200,
		});
	});

	it("maps 200 with recoveryTasks array to ready", () => {
		const view = recoveryTasksViewFromResponse(200, {
			recoveryTasks: [realRecoveryTask],
		});
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items[0]?.recoveryTaskId, RECOVERY_TASK_ID);
		}
	});

	it("maps malformed body to stale", () => {
		assert.deepEqual(recoveryTasksViewFromResponse(200, { bad: true }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("fetchIncidentRecoveryTasks", () => {
	it("uses fetchFn and maps network failure to stale", async () => {
		const view = await fetchIncidentRecoveryTasks(
			AGENCY_ID,
			INCIDENT_ID,
			async () => {
				throw new Error("offline");
			},
		);
		assert.deepEqual(view, { kind: "stale", status: null });
	});

	it("parses JSON collection on success", async () => {
		const view = await fetchIncidentRecoveryTasks(
			AGENCY_ID,
			INCIDENT_ID,
			async () =>
				new Response(JSON.stringify({ recoveryTasks: [realRecoveryTask] }), {
					status: 200,
					headers: { "content-type": "application/json" },
				}),
		);
		assert.equal(view.kind, "ready");
	});
});

describe("recoveryTaskDisplayLabel", () => {
	it("includes stepKind, status and pending approval hint", () => {
		assert.equal(
			recoveryTaskDisplayLabel(realRecoveryTask),
			"VERIFY_INTEGRITY · PENDING · aprovação pendente",
		);
	});

	it("omits approval hint when not required or already granted", () => {
		assert.equal(
			recoveryTaskDisplayLabel({
				...realRecoveryTask,
				stepRequiresApproval: false,
			}),
			"VERIFY_INTEGRITY · PENDING",
		);
	});
});

describe("recoveryTaskEmptyDescription", () => {
	it("references the collection contract", () => {
		assert.match(
			recoveryTaskEmptyDescription("no_recovery_tasks"),
			new RegExp(RECOVERY_TASKS_COLLECTION_CONTRACT.slice(0, 20)),
		);
	});
});
