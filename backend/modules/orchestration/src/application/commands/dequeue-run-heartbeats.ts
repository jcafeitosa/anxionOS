import { type DequeueRunHeartbeatsCommand } from "@anxionos/contracts/orchestration";
import type { RunHeartbeat } from "../../domain/entities/run-heartbeat";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type { OrchestrationUnitOfWork } from "../../domain/ports/orchestration-unit-of-work";
import { dequeueRunHeartbeatsCommandSchema } from "@anxionos/contracts/orchestration";

export interface DequeueRunHeartbeatsResult {
    heartbeats: RunHeartbeat[];
}
export interface DequeueRunHeartbeatsDeps {
    unitOfWork: OrchestrationUnitOfWork;
    leaseClock: LeaseClock;
}

export async function dequeueRunHeartbeats(deps, input = { limit: 50 }) {
    const command = dequeueRunHeartbeatsCommandSchema.parse(input);
    const now = deps.leaseClock.now();
    return deps.unitOfWork.runInTransaction(async (context) => {
        const due = await context.runHeartbeatRepository.findDuePending(command.limit, now);
        const claimed = [];
        for (const heartbeat of due) {
            const updated = await context.runHeartbeatRepository.save({
                ...heartbeat,
                status: "processing",
                attempt: heartbeat.attempt + 1,
            });
            claimed.push(updated);
        }
        return { heartbeats: claimed };
    });
}
