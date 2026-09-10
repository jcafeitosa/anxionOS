import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { createOrchestrationUnitOfWork } from "./orchestration-unit-of-work";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGateBindingRepository } from "./persistence/gate-binding-repository";
import { createDrizzleGoalRepository } from "./persistence/goal-repository";
import { createDrizzleRunHeartbeatRepository } from "./persistence/run-heartbeat-repository";
import { createDrizzleRunRepository } from "./persistence/run-repository";
import * as schema from "./persistence/schema";
import { createDrizzleTaskLeaseRepository } from "./persistence/task-lease-repository";
import { createDrizzleTaskRepository } from "./persistence/task-repository";
import { createDrizzleTaskboardMirrorRepository } from "./persistence/taskboard-mirror-repository";

export function createOrchestrationDb(pool: Pool) {
	const db = drizzle(pool, { schema });
	return {
		db,
		schema,
		goalRepository: createDrizzleGoalRepository(db),
		taskRepository: createDrizzleTaskRepository(db),
		runRepository: createDrizzleRunRepository(db),
		taskLeaseRepository: createDrizzleTaskLeaseRepository(db),
		gateBindingRepository: createDrizzleGateBindingRepository(db),
		commandJournal: createDrizzleCommandJournalRepository(db),
		runHeartbeatRepository: createDrizzleRunHeartbeatRepository(db),
		taskboardMirrorRepository: createDrizzleTaskboardMirrorRepository(db),
		unitOfWork: createOrchestrationUnitOfWork(pool),
	};
}
