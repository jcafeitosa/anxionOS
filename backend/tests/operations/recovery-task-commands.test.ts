import { describe, expect, test } from "bun:test";
import { OPERATIONS_EVENT_TYPES } from "@anxionos/contracts/operations";
import {
	OperationsCommandError,
	approveRecoveryTask,
	cancelRecoveryTask,
	completeRecoveryTask,
	createIncident,
	failRecoveryTask,
	startRecoveryTask,
	startRecoveryTaskExecution,
} from "@anxionos/operations";
import {
	createInMemoryCommandJournalRepository,
	createInMemoryRecoveryTaskRepository,
	createRecordingOperationsUnitOfWork,
} from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function createDeps(now = "2026-09-10T14:00:00.000Z") {
	const commandJournal = createInMemoryCommandJournalRepository();
	const recoveryTasks = createInMemoryRecoveryTaskRepository();
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
		recoveryTasks,
	});
	return {
		deps: { unitOfWork, commandJournal, now: () => now },
		published,
		recoveryTasks,
	};
}

async function openIncident(deps: ReturnType<typeof createDeps>["deps"]) {
	return createIncident(deps, {
		commandId: "11111111-1111-4111-8111-111111111111",
		organizationId,
		title: "Database corruption detected",
		severity: "CRITICAL",
		serviceId: "postgres-primary",
	});
}

describe("recovery task commands (ANX-158 S4b)", () => {
	test("dangerous step starts in AWAITING_APPROVAL without approval flag", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const result = await startRecoveryTask(deps, {
			commandId: "22222222-2222-4222-8222-222222222222",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "RESTORE_DATABASE",
		});
		expect(result.recoveryTaskId).toMatch(/^ops_rcv_/);
		expect(result.revision).toBe(1);

		const stored = await recoveryTasks.findById(result.recoveryTaskId!);
		expect(stored?.status).toBe("AWAITING_APPROVAL");
		expect(stored?.stepRequiresApproval).toBe(true);
		expect(stored?.hasRequiredApproval).toBe(false);

		const startedEvent = published.find(
			(e) => e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_STARTED,
		);
		expect(startedEvent?.payload).toMatchObject({
			status: "AWAITING_APPROVAL",
			stepKind: "RESTORE_DATABASE",
			stepRequiresApproval: true,
			hasRequiredApproval: false,
		});
	});

	test("safe step starts in PENDING", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const result = await startRecoveryTask(deps, {
			commandId: "33333333-3333-4333-8333-333333333333",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "VALIDATE_SCHEMA",
			initiatedByPrincipalId: principalId,
		});
		expect(result.recoveryTaskId).toMatch(/^ops_rcv_/);

		const stored = await recoveryTasks.findById(result.recoveryTaskId!);
		expect(stored?.status).toBe("PENDING");
		expect(stored?.stepRequiresApproval).toBe(false);
		expect(stored?.hasRequiredApproval).toBe(false);

		const startedEvent = published.find(
			(e) => e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_STARTED,
		);
		expect(startedEvent?.payload).toMatchObject({
			status: "PENDING",
			stepKind: "VALIDATE_SCHEMA",
			stepRequiresApproval: false,
			initiatedByPrincipalId: principalId,
		});
	});

	test("dangerous step with approval starts in APPROVED", async () => {
		const { deps, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const result = await startRecoveryTask(deps, {
			commandId: "44444444-4444-4444-8444-444444444444",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "REPLAY_OUTBOX",
			hasRequiredApproval: true,
		});
		const stored = await recoveryTasks.findById(result.recoveryTaskId!);
		expect(stored?.status).toBe("APPROVED");
		expect(stored?.hasRequiredApproval).toBe(true);
	});

	test("rejects LLM step kind", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		await expect(
			startRecoveryTask(deps, {
				commandId: "55555555-5555-4555-8555-555555555555",
				organizationId,
				incidentId: opened.incidentId!,
				stepKind: "LLM_INVOKE",
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STEP_KIND_REJECTED",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects inference step kind", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		await expect(
			startRecoveryTask(deps, {
				commandId: "66666666-6666-4666-8666-666666666666",
				organizationId,
				incidentId: opened.incidentId!,
				stepKind: "INFERENCE_CALL",
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STEP_KIND_REJECTED",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects unknown step kind", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		await expect(
			startRecoveryTask(deps, {
				commandId: "77777777-7777-4777-8777-777777777777",
				organizationId,
				incidentId: opened.incidentId!,
				stepKind: "UNKNOWN_STEP",
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STEP_KIND_REJECTED",
		} satisfies Partial<OperationsCommandError>);
	});

	test("idempotent replay for startRecoveryTask", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const commandId = "88888888-8888-4888-8888-888888888888";
		const first = await startRecoveryTask(deps, {
			commandId,
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "CHECK_CHECKPOINT",
		});
		const second = await startRecoveryTask(deps, {
			commandId,
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "CHECK_CHECKPOINT",
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects startRecoveryTask for incident from another organization", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		await expect(
			startRecoveryTask(deps, {
				commandId: "99999999-9999-4999-8999-999999999999",
				organizationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				incidentId: opened.incidentId!,
				stepKind: "VALIDATE_SCHEMA",
			}),
		).rejects.toMatchObject({
			code: "OPS_CROSS_TENANT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects startRecoveryTask for unknown incident", async () => {
		const { deps } = createDeps();
		await expect(
			startRecoveryTask(deps, {
				commandId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaac",
				organizationId,
				incidentId: "ops_inc_00000000-0000-4000-8000-000000000000",
				stepKind: "VALIDATE_SCHEMA",
			}),
		).rejects.toMatchObject({
			code: "OPS_INCIDENT_NOT_FOUND",
		} satisfies Partial<OperationsCommandError>);
	});
});

describe("recovery task commands (ANX-158 S4c)", () => {
	test("approves dangerous task from AWAITING_APPROVAL to APPROVED", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "b1111111-1111-4111-8111-111111111111",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "RESTORE_DATABASE",
		});
		const result = await approveRecoveryTask(deps, {
			commandId: "b2222222-2222-4222-8222-222222222222",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
			approvedByPrincipalId: principalId,
		});
		expect(result.revision).toBe(2);

		const stored = await recoveryTasks.findById(started.recoveryTaskId!);
		expect(stored?.status).toBe("APPROVED");
		expect(stored?.hasRequiredApproval).toBe(true);

		const approvedEvent = published.find(
			(e) => e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_APPROVED,
		);
		expect(approvedEvent?.payload).toMatchObject({
			fromStatus: "AWAITING_APPROVAL",
			toStatus: "APPROVED",
			hasRequiredApproval: true,
			approvedByPrincipalId: principalId,
			revision: 2,
		});
	});

	test("dangerous step end-to-end: start → approve → execute", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "b3333333-3333-4333-8333-333333333333",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "PURGE_QUEUE",
		});
		expect(
			(await recoveryTasks.findById(started.recoveryTaskId!))?.status,
		).toBe("AWAITING_APPROVAL");

		const approved = await approveRecoveryTask(deps, {
			commandId: "b4444444-4444-4444-8444-444444444444",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		expect(approved.revision).toBe(2);

		const executed = await startRecoveryTaskExecution(deps, {
			commandId: "b5555555-5555-4555-8555-555555555555",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 2,
		});
		expect(executed.revision).toBe(3);

		const stored = await recoveryTasks.findById(started.recoveryTaskId!);
		expect(stored?.status).toBe("IN_PROGRESS");

		const executionEvent = published.find(
			(e) =>
				e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_EXECUTION_STARTED,
		);
		expect(executionEvent?.payload).toMatchObject({
			fromStatus: "APPROVED",
			toStatus: "IN_PROGRESS",
			revision: 3,
		});
	});

	test("cannot approve task not in AWAITING_APPROVAL", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "b6666666-6666-4666-8666-666666666666",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "VALIDATE_SCHEMA",
		});
		await expect(
			approveRecoveryTask(deps, {
				commandId: "b7777777-7777-4777-8777-777777777777",
				organizationId,
				recoveryTaskId: started.recoveryTaskId!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("cannot bypass lifecycle: execute dangerous task without approval", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "b8888888-8888-4888-8888-888888888888",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "REBUILD_PROJECTION",
		});
		await expect(
			startRecoveryTaskExecution(deps, {
				commandId: "b9999999-9999-4999-8999-999999999999",
				organizationId,
				recoveryTaskId: started.recoveryTaskId!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("cannot execute from AWAITING_APPROVAL even after partial approval path", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "c1111111-1111-4111-8111-111111111111",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "REPLAY_OUTBOX",
		});
		await expect(
			startRecoveryTaskExecution(deps, {
				commandId: "c2222222-2222-4222-8222-222222222222",
				organizationId,
				recoveryTaskId: started.recoveryTaskId!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("safe step executes from PENDING without approval", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "c3333333-3333-4333-8333-333333333333",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "CHECK_CHECKPOINT",
		});
		const executed = await startRecoveryTaskExecution(deps, {
			commandId: "c4444444-4444-4444-8444-444444444444",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		expect(executed.revision).toBe(2);
		expect(
			(await recoveryTasks.findById(started.recoveryTaskId!))?.status,
		).toBe("IN_PROGRESS");
		expect(
			published.some(
				(e) =>
					e.eventType ===
					OPERATIONS_EVENT_TYPES.RECOVERY_TASK_EXECUTION_STARTED,
			),
		).toBe(true);
	});

	test("idempotent replay for approveRecoveryTask", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "c5555555-5555-4555-8555-555555555555",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "RESTORE_DATABASE",
		});
		const commandId = "c6666666-6666-4666-8666-666666666666";
		const first = await approveRecoveryTask(deps, {
			commandId,
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		const second = await approveRecoveryTask(deps, {
			commandId,
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects approveRecoveryTask for recovery task from another organization", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "c7777777-7777-4777-8777-777777777777",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "RESTORE_DATABASE",
		});
		await expect(
			approveRecoveryTask(deps, {
				commandId: "c8888888-8888-4888-8888-888888888888",
				organizationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				recoveryTaskId: started.recoveryTaskId!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_CROSS_TENANT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects approveRecoveryTask for unknown recovery task", async () => {
		const { deps } = createDeps();
		await expect(
			approveRecoveryTask(deps, {
				commandId: "c9999999-9999-4999-8999-999999999999",
				organizationId,
				recoveryTaskId: "ops_rcv_00000000-0000-4000-8000-000000000000",
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_TASK_NOT_FOUND",
		} satisfies Partial<OperationsCommandError>);
	});

	test("idempotent replay for startRecoveryTaskExecution", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "d1111111-1111-4111-8111-111111111111",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "CHECK_CHECKPOINT",
		});
		const commandId = "d2222222-2222-4222-8222-222222222222";
		const first = await startRecoveryTaskExecution(deps, {
			commandId,
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		const second = await startRecoveryTaskExecution(deps, {
			commandId,
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects startRecoveryTaskExecution for recovery task from another organization", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "d3333333-3333-4333-8333-333333333333",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "CHECK_CHECKPOINT",
		});
		await expect(
			startRecoveryTaskExecution(deps, {
				commandId: "d4444444-4444-4444-8444-444444444444",
				organizationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				recoveryTaskId: started.recoveryTaskId!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_CROSS_TENANT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects startRecoveryTaskExecution for unknown recovery task", async () => {
		const { deps } = createDeps();
		await expect(
			startRecoveryTaskExecution(deps, {
				commandId: "d5555555-5555-4555-8555-555555555555",
				organizationId,
				recoveryTaskId: "ops_rcv_00000000-0000-4000-8000-000000000000",
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_TASK_NOT_FOUND",
		} satisfies Partial<OperationsCommandError>);
	});
});

async function runDangerousRecoveryToInProgress(
	deps: ReturnType<typeof createDeps>["deps"],
) {
	const opened = await openIncident(deps);
	const started = await startRecoveryTask(deps, {
		commandId: "e1111111-1111-4111-8111-111111111111",
		organizationId,
		incidentId: opened.incidentId!,
		stepKind: "RESTORE_DATABASE",
	});
	await approveRecoveryTask(deps, {
		commandId: "e2222222-2222-4222-8222-222222222222",
		organizationId,
		recoveryTaskId: started.recoveryTaskId!,
		expectedRevision: 1,
		approvedByPrincipalId: principalId,
	});
	const executed = await startRecoveryTaskExecution(deps, {
		commandId: "e3333333-3333-4333-8333-333333333333",
		organizationId,
		recoveryTaskId: started.recoveryTaskId!,
		expectedRevision: 2,
	});
	return { recoveryTaskId: started.recoveryTaskId!, revision: executed.revision };
}

describe("recovery task commands (ANX-158 S4d)", () => {
	test("completes IN_PROGRESS recovery task", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const { recoveryTaskId, revision } =
			await runDangerousRecoveryToInProgress(deps);
		const result = await completeRecoveryTask(deps, {
			commandId: "e4444444-4444-4444-8444-444444444444",
			organizationId,
			recoveryTaskId,
			expectedRevision: revision!,
			completedByPrincipalId: principalId,
		});
		expect(result.revision).toBe(revision! + 1);

		const stored = await recoveryTasks.findById(recoveryTaskId);
		expect(stored?.status).toBe("COMPLETED");

		const completedEvent = published.find(
			(e) => e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_COMPLETED,
		);
		expect(completedEvent?.payload).toMatchObject({
			fromStatus: "IN_PROGRESS",
			toStatus: "COMPLETED",
			stepKind: "RESTORE_DATABASE",
			completedByPrincipalId: principalId,
			revision: revision! + 1,
		});
	});

	test("fails IN_PROGRESS recovery task", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const { recoveryTaskId, revision } =
			await runDangerousRecoveryToInProgress(deps);
		const result = await failRecoveryTask(deps, {
			commandId: "e5555555-5555-4555-8555-555555555555",
			organizationId,
			recoveryTaskId,
			expectedRevision: revision!,
			failureReason: "restore checksum mismatch",
			failedByPrincipalId: principalId,
		});
		expect(result.revision).toBe(revision! + 1);

		const stored = await recoveryTasks.findById(recoveryTaskId);
		expect(stored?.status).toBe("FAILED");

		const failedEvent = published.find(
			(e) => e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_FAILED,
		);
		expect(failedEvent?.payload).toMatchObject({
			fromStatus: "IN_PROGRESS",
			toStatus: "FAILED",
			failureReason: "restore checksum mismatch",
			failedByPrincipalId: principalId,
		});
	});

	test("cancels IN_PROGRESS recovery task", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const { recoveryTaskId, revision } =
			await runDangerousRecoveryToInProgress(deps);
		const result = await cancelRecoveryTask(deps, {
			commandId: "e6666666-6666-4666-8666-666666666666",
			organizationId,
			recoveryTaskId,
			expectedRevision: revision!,
			cancelReason: "operator aborted",
			cancelledByPrincipalId: principalId,
		});
		expect(result.revision).toBe(revision! + 1);
		expect((await recoveryTasks.findById(recoveryTaskId))?.status).toBe(
			"CANCELLED",
		);
		expect(
			published.some(
				(e) => e.eventType === OPERATIONS_EVENT_TYPES.RECOVERY_TASK_CANCELLED,
			),
		).toBe(true);
	});

	test("cancels AWAITING_APPROVAL recovery task", async () => {
		const { deps, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "e7777777-7777-4777-8777-777777777777",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "PURGE_QUEUE",
		});
		await cancelRecoveryTask(deps, {
			commandId: "e8888888-8888-4888-8888-888888888888",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		expect(
			(await recoveryTasks.findById(started.recoveryTaskId!))?.status,
		).toBe("CANCELLED");
	});

	test("dangerous step end-to-end: start → approve → execute → complete", async () => {
		const { deps, published, recoveryTasks } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "e9999999-9999-4999-8999-999999999999",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "REBUILD_PROJECTION",
		});
		const approved = await approveRecoveryTask(deps, {
			commandId: "f1111111-1111-4111-8111-111111111111",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: 1,
		});
		const executed = await startRecoveryTaskExecution(deps, {
			commandId: "f2222222-2222-4222-8222-222222222222",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: approved.revision!,
		});
		const completed = await completeRecoveryTask(deps, {
			commandId: "f3333333-3333-4333-8333-333333333333",
			organizationId,
			recoveryTaskId: started.recoveryTaskId!,
			expectedRevision: executed.revision!,
		});
		expect(completed.revision).toBe(4);
		expect(
			(await recoveryTasks.findById(started.recoveryTaskId!))?.status,
		).toBe("COMPLETED");
		expect(
			published.map((event) => event.eventType),
		).toEqual([
			OPERATIONS_EVENT_TYPES.INCIDENT_OPENED,
			OPERATIONS_EVENT_TYPES.RECOVERY_TASK_STARTED,
			OPERATIONS_EVENT_TYPES.RECOVERY_TASK_APPROVED,
			OPERATIONS_EVENT_TYPES.RECOVERY_TASK_EXECUTION_STARTED,
			OPERATIONS_EVENT_TYPES.RECOVERY_TASK_COMPLETED,
		]);
	});

	test("cannot complete from wrong status", async () => {
		const { deps } = createDeps();
		const opened = await openIncident(deps);
		const started = await startRecoveryTask(deps, {
			commandId: "f4444444-4444-4444-8444-444444444444",
			organizationId,
			incidentId: opened.incidentId!,
			stepKind: "RESTORE_DATABASE",
		});
		await expect(
			completeRecoveryTask(deps, {
				commandId: "f5555555-5555-4555-8555-555555555555",
				organizationId,
				recoveryTaskId: started.recoveryTaskId!,
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("terminal states block further transitions", async () => {
		const { deps } = createDeps();
		const { recoveryTaskId, revision } =
			await runDangerousRecoveryToInProgress(deps);
		await completeRecoveryTask(deps, {
			commandId: "f6666666-6666-4666-8666-666666666666",
			organizationId,
			recoveryTaskId,
			expectedRevision: revision!,
		});
		await expect(
			failRecoveryTask(deps, {
				commandId: "f7777777-7777-4777-8777-777777777777",
				organizationId,
				recoveryTaskId,
				expectedRevision: revision! + 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
		await expect(
			cancelRecoveryTask(deps, {
				commandId: "f8888888-8888-4888-8888-888888888888",
				organizationId,
				recoveryTaskId,
				expectedRevision: revision! + 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_STATUS_INVALID",
		} satisfies Partial<OperationsCommandError>);
	});

	test("idempotent replay for completeRecoveryTask", async () => {
		const { deps } = createDeps();
		const { recoveryTaskId, revision } =
			await runDangerousRecoveryToInProgress(deps);
		const commandId = "f9999999-9999-4999-8999-999999999999";
		const first = await completeRecoveryTask(deps, {
			commandId,
			organizationId,
			recoveryTaskId,
			expectedRevision: revision!,
		});
		const second = await completeRecoveryTask(deps, {
			commandId,
			organizationId,
			recoveryTaskId,
			expectedRevision: revision!,
		});
		expect(second).toEqual({ ...first, idempotentReplay: true });
	});

	test("rejects completeRecoveryTask for recovery task from another organization", async () => {
		const { deps } = createDeps();
		const { recoveryTaskId, revision } =
			await runDangerousRecoveryToInProgress(deps);
		await expect(
			completeRecoveryTask(deps, {
				commandId: "a1111111-1111-4111-8111-111111111111",
				organizationId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				recoveryTaskId,
				expectedRevision: revision!,
			}),
		).rejects.toMatchObject({
			code: "OPS_CROSS_TENANT",
		} satisfies Partial<OperationsCommandError>);
	});

	test("rejects completeRecoveryTask for unknown recovery task", async () => {
		const { deps } = createDeps();
		await expect(
			completeRecoveryTask(deps, {
				commandId: "a2222222-2222-4222-8222-222222222222",
				organizationId,
				recoveryTaskId: "ops_rcv_00000000-0000-4000-8000-000000000000",
				expectedRevision: 1,
			}),
		).rejects.toMatchObject({
			code: "OPS_RECOVERY_TASK_NOT_FOUND",
		} satisfies Partial<OperationsCommandError>);
	});
});
