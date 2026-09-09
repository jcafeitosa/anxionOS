import type { Pool } from "pg";
import type { OrchestrationUnitOfWork } from "../domain/ports/orchestration-unit-of-work";
import { appendJournal, enqueueOutbox } from "@anxionos/eventing";
import { drizzle } from "drizzle-orm/node-postgres";
import { createDrizzleCommandJournalRepository } from "./persistence/command-journal-repository";
import { createDrizzleGateBindingRepository } from "./persistence/gate-binding-repository";
import { createDrizzleGoalRepository } from "./persistence/goal-repository";
import { createDrizzleRunRepository } from "./persistence/run-repository";
import { createDrizzleTaskLeaseRepository } from "./persistence/task-lease-repository";
import { createDrizzleTaskRepository } from "./persistence/task-repository";
import { createDrizzleRunHeartbeatRepository } from "./persistence/run-heartbeat-repository";
import { createDrizzleTaskboardMirrorRepository } from "./persistence/taskboard-mirror-repository";
import * as schema from "./persistence/schema";

function createTransactionContext(client) {
    const db = drizzle(client, { schema });
    return {
        client,
        goalRepository: createDrizzleGoalRepository(db),
        taskRepository: createDrizzleTaskRepository(db),
        runRepository: createDrizzleRunRepository(db),
        taskLeaseRepository: createDrizzleTaskLeaseRepository(db),
        gateBindingRepository: createDrizzleGateBindingRepository(db),
        commandJournal: createDrizzleCommandJournalRepository(db),
        runHeartbeatRepository: createDrizzleRunHeartbeatRepository(db),
        taskboardMirrorRepository: createDrizzleTaskboardMirrorRepository(db),
        async publishEvents(envelopes) {
            for (const envelope of envelopes) {
                await appendJournal(client, envelope);
                await enqueueOutbox(client, envelope);
            }
        },
    };
}
export function createOrchestrationUnitOfWork(pool: Pool): OrchestrationUnitOfWork {
    return {
        async runInTransaction(work) {
            const client = await pool.connect();
            try {
                await client.query("BEGIN");
                const context = createTransactionContext(client);
                const result = await work(context);
                await client.query("COMMIT");
                return result;
            }
            catch (error) {
                await client.query("ROLLBACK");
                throw error;
            }
            finally {
                client.release();
            }
        },
    };
}
