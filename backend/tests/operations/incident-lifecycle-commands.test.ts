import { describe, expect, test } from "bun:test";
import { OPERATIONS_EVENT_TYPES } from "@anxionos/contracts/operations";
import {
	attachIncidentRunbook,
	createIncident,
	OperationsCommandError,
	transitionIncidentStatus,
} from "@anxionos/operations";
import {
	createInMemoryCommandJournalRepository,
	createRecordingOperationsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const runbookId = "ops_rnb_cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createDeps(now = "2026-09-10T14:00:00.000Z") {
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
	return {
		deps: { unitOfWork, commandJournal, now: () => now },
		published,
	};
}

async function openIncident(deps: ReturnType<typeof createDeps>["deps"]) {
	return createIncident(deps, {
		commandId: "11111111-1111-4111-8111-111111111111",
		organizationId,
		title: "API latency spike",
		severity: "HIGH",
		serviceId: "api-gateway",
	});
}

describe("incident lifecycle commands (ANX-311 S2)", () => {
	test("createIncident opens at revision 1", async () => {
		const { deps } = createDeps();
		const result = await openIncident(deps);
		expect(result.revision).toBe(1);
		expect(result.incidentId).toMatch(/^ops_inc_/);
	});

	test("attachIncidentRunbook emits runbook attached event", async () => {
		const { deps, published } = createDeps();
		const opened = await openIncident(deps);
		const result = await attachIncidentRunbook(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			incidentId: opened.incidentId!,
			expectedRevision: 1,
			runbookId,
			runbookVersion: "1.0.0",
			responsiblePrincipalId: principalId,
			evidence: "staging probe failed 3x",
		});
		expect(result.revision).toBe(2);
		expect(
			published.some(
				(e) => e.eventType === OPERATIONS_EVENT_TYPES.INCIDENT_RUNBOOK_ATTACHED,
			),
		).toBe(true);
	});

	test("full lifecycle OPEN→ACK→INVESTIGATING→MITIGATING→RESOLVED→CLOSED", async () => {
		const { deps, published } = createDeps();
		const opened = await openIncident(deps);
		const incidentId = opened.incidentId!;

		const ack = await transitionIncidentStatus(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			organizationId,
			incidentId,
			expectedRevision: 1,
			targetStatus: "ACKNOWLEDGED",
		});
		expect(ack.revision).toBe(2);

		const investigating = await transitionIncidentStatus(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			organizationId,
			incidentId,
			expectedRevision: 2,
			targetStatus: "INVESTIGATING",
		});
		expect(investigating.revision).toBe(3);

		await attachIncidentRunbook(deps, {
			commandId: "55555555-5555-4555-8555-555555555555",
			organizationId,
			incidentId,
			expectedRevision: 3,
			runbookId,
			runbookVersion: "1.0.0",
			responsiblePrincipalId: principalId,
		});

		const mitigating = await transitionIncidentStatus(deps, {
			commandId: "66666666-6666-4666-8666-666666666666",
			organizationId,
			incidentId,
			expectedRevision: 4,
			targetStatus: "MITIGATING",
		});
		expect(mitigating.revision).toBe(5);

		const resolved = await transitionIncidentStatus(deps, {
			commandId: "77777777-7777-4777-8777-777777777777",
			organizationId,
			incidentId,
			expectedRevision: 5,
			targetStatus: "RESOLVED",
			reason: "runbook completed",
		});
		expect(resolved.revision).toBe(6);

		const closed = await transitionIncidentStatus(deps, {
			commandId: "88888888-8888-4888-8888-888888888888",
			organizationId,
			incidentId,
			expectedRevision: 6,
			targetStatus: "CLOSED",
		});
		expect(closed.revision).toBe(7);

		const statusEvents = published.filter(
			(e) => e.eventType === OPERATIONS_EVENT_TYPES.INCIDENT_STATUS_CHANGED,
		);
		expect(statusEvents.length).toBe(5);
	});

	test("rejects MITIGATING without runbook", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		await transitionIncidentStatus(deps, {
			commandId: "99999999-9999-4999-8999-999999999999",
			organizationId,
			incidentId: opened.incidentId!,
			expectedRevision: 1,
			targetStatus: "INVESTIGATING",
		});
		await expect(
			transitionIncidentStatus(deps, {
				commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab",
				organizationId,
				incidentId: opened.incidentId!,
				expectedRevision: 2,
				targetStatus: "MITIGATING",
			}),
		).rejects.toMatchObject({
			code: "OPS_INCIDENT_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("idempotent replay for attachIncidentRunbook", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const commandId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc";
		const first = await attachIncidentRunbook(deps, {
			commandId,
			organizationId,
			incidentId: opened.incidentId!,
			expectedRevision: 1,
			runbookId,
			runbookVersion: "1.0.0",
		});
		const second = await attachIncidentRunbook(deps, {
			commandId,
			organizationId,
			incidentId: opened.incidentId!,
			expectedRevision: 1,
			runbookId,
			runbookVersion: "1.0.0",
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects transitionIncidentStatus for incident from another organization", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const otherOrganizationId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
		await expect(
			transitionIncidentStatus(deps, {
				commandId: "cccccccc-cccc-4ccc-8ccc-ccccccccccdd",
				organizationId: otherOrganizationId,
				incidentId: opened.incidentId!,
				expectedRevision: 1,
				targetStatus: "ACKNOWLEDGED",
			}),
		).rejects.toMatchObject({
			code: "OPS_CROSS_TENANT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects attachIncidentRunbook for incident from another organization", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const otherOrganizationId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
		await expect(
			attachIncidentRunbook(deps, {
				commandId: "cccccccc-cccc-4ccc-8ccc-ccccccccccee",
				organizationId: otherOrganizationId,
				incidentId: opened.incidentId!,
				expectedRevision: 1,
				runbookId,
				runbookVersion: "1.0.0",
			}),
		).rejects.toMatchObject({
			code: "OPS_CROSS_TENANT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects transitionIncidentStatus with stale expectedRevision (revision conflict)", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		await transitionIncidentStatus(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-ccccccccccff",
			organizationId,
			incidentId: opened.incidentId!,
			expectedRevision: 1,
			targetStatus: "ACKNOWLEDGED",
		});
		await expect(
			transitionIncidentStatus(deps, {
				commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc00",
				organizationId,
				incidentId: opened.incidentId!,
				expectedRevision: 1,
				targetStatus: "INVESTIGATING",
			}),
		).rejects.toMatchObject({
			code: "OPS_REVISION_CONFLICT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects transitionIncidentStatus once incident is CLOSED (terminal)", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const incidentId = opened.incidentId!;
		await transitionIncidentStatus(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc01",
			organizationId,
			incidentId,
			expectedRevision: 1,
			targetStatus: "ACKNOWLEDGED",
		});
		await transitionIncidentStatus(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc02",
			organizationId,
			incidentId,
			expectedRevision: 2,
			targetStatus: "INVESTIGATING",
		});
		await transitionIncidentStatus(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc03",
			organizationId,
			incidentId,
			expectedRevision: 3,
			targetStatus: "RESOLVED",
		});
		await transitionIncidentStatus(deps, {
			commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc04",
			organizationId,
			incidentId,
			expectedRevision: 4,
			targetStatus: "CLOSED",
		});
		await expect(
			transitionIncidentStatus(deps, {
				commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc06",
				organizationId,
				incidentId,
				expectedRevision: 5,
				targetStatus: "OPEN",
			}),
		).rejects.toMatchObject({
			code: "OPS_INCIDENT_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects transitionIncidentStatus for unknown incident", async () => {
		const { deps } = createDeps();
		await expect(
			transitionIncidentStatus(deps, {
				commandId: "cccccccc-cccc-4ccc-8ccc-cccccccccc07",
				organizationId,
				incidentId: "ops_inc_00000000-0000-4000-8000-000000000000",
				expectedRevision: 1,
				targetStatus: "ACKNOWLEDGED",
			}),
		).rejects.toMatchObject({
			code: "OPS_INCIDENT_NOT_FOUND",
		} satisfies Partial<OperationsCommandError>);
	});
});
