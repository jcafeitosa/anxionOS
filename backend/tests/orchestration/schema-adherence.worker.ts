import { randomUUID } from "node:crypto";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	createOrchestrationDb,
	ensureOrchestrationSchema,
} from "@anxionos/orchestration";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const pool = createPgPool(url);
try {
	await ensureOrchestrationSchema(pool);
	await pool.query(
		"TRUNCATE orchestration_goals, orchestration_tasks, orchestration_runs, orchestration_task_leases, orchestration_run_heartbeats, orchestration_gate_bindings, orchestration_command_journal, orchestration_taskboard_mirror RESTART IDENTITY CASCADE",
	);
	const db = createOrchestrationDb(pool);
	const organizationId = `org_${randomUUID()}`;
	const issueIdentifier = "ANX-999999";
	const goal = await db.goalRepository.save({
		organizationId,
		title: "Adherence goal",
		status: "draft",
	});
	const task = await db.taskRepository.save({
		organizationId,
		goalId: goal.id,
		goalAncestry: [goal.id],
		issueIdentifier,
		title: "Adherence task",
	});
	const run = await db.runRepository.save({
		taskId: task.id,
		agentId: "agent-1",
		organizationId,
		goalAncestry: [goal.id],
		issueIdentifier,
		coalesceKey: `${task.id}:agent-1`,
	});
	const lease = await db.taskLeaseRepository.save({
		taskId: task.id,
		runId: run.id,
		agentId: "agent-1",
		leaseToken: randomUUID(),
		leasedAt: new Date(),
		expiresAt: new Date(Date.now() + 60_000),
	});
	const heartbeat = await db.runHeartbeatRepository.save({
		runId: run.id,
		taskId: task.id,
		agentId: "agent-1",
		coalesceKey: `${task.id}:agent-1`,
		nextWakeAt: new Date(Date.now() + 30_000),
	});
	const binding = await db.gateBindingRepository.append({
		organizationId,
		gateId: "G0",
		issueIdentifier,
		disposition: "PASS",
		reviewerId: "reviewer-1",
		hierarchyModeAtRecord: "HIERARCHY_TREE",
		recordedAt: new Date(),
	});
	const commandId = randomUUID();
	const journal = await db.commandJournal.record({
		commandId,
		commandName: "adherenceCommand",
		aggregateId: goal.id,
		aggregateType: "goal",
		revision: 1,
		responseSnapshot: { ok: true },
	});
	const mirror = await db.taskboardMirrorRepository.recordIfAbsent({
		issueIdentifier,
		boardVersion: 1,
		status: "in_progress",
		threadId: "thread-1",
		occurredAt: new Date(),
	});
	if (
		!goal.id ||
		!task.id ||
		!run.id ||
		!lease.id ||
		!heartbeat.id ||
		!binding.id ||
		journal.commandId !== commandId ||
		mirror !== "inserted"
	)
		throw new Error("orchestration adherence assertion failed");
	console.log("ORCHESTRATION_ADHERENCE_OK");
} finally {
	await pool.end();
}
