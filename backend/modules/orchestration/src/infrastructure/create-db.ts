import type { Pool } from "pg";
import * as schema from "./persistence/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { createOrchestrationUnitOfWork } from "./orchestration-unit-of-work";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGateBindingRepository } from "./persistence/gate-binding-repository";
import { createDrizzleGoalRepository } from "./persistence/goal-repository";
import { createDrizzleRunRepository } from "./persistence/run-repository";
import { createDrizzleTaskLeaseRepository } from "./persistence/task-lease-repository";
import { createDrizzleTaskRepository } from "./persistence/task-repository";
import { createDrizzleRunHeartbeatRepository } from "./persistence/run-heartbeat-repository";
import { createDrizzleTaskboardMirrorRepository } from "./persistence/taskboard-mirror-repository";

};
    schema: typeof schema;
    goalRepository: import("..").GoalRepository;
    taskRepository: import("..").TaskRepository;
    runRepository: import("..").RunRepository;
    taskLeaseRepository: import("..").TaskLeaseRepository;
    gateBindingRepository: import("..").GateBindingRepository;
    commandJournal: import("..").CommandJournalRepository;
    runHeartbeatRepository: import("..").RunHeartbeatRepository;
    taskboardMirrorRepository: import("..").TaskboardMirrorRepository;
    unitOfWork: import("..").OrchestrationUnitOfWork;
};

export function createOrchestrationDb(pool: Pool): {
    db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
        $client: Pool {
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
