import type { DequeueRunHeartbeatsCommand } from "@anxionos/contracts/orchestration";
import { dequeueRunHeartbeatsCommandSchema } from "@anxionos/contracts/orchestration";
import { canTransitionRunStatus } from "../../domain/entities/run";
import type { RunHeartbeat } from "../../domain/entities/run-heartbeat";
import { createRunBudgetStoppedEvent } from "../../domain/events/orchestration-events";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type { OperationalBudgetPort } from "../../domain/ports/operational-budget";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";

export interface DequeueRunHeartbeatsResult {
	heartbeats: RunHeartbeat[];
	budgetStoppedRunIds: string[];
}
export interface DequeueRunHeartbeatsDeps {
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
	operationalBudget: OperationalBudgetPort;
}

export async function dequeueRunHeartbeats(
	deps: DequeueRunHeartbeatsDeps,
	input?: DequeueRunHeartbeatsCommand,
): Promise<DequeueRunHeartbeatsResult> {
	const command = dequeueRunHeartbeatsCommandSchema.parse(input);
	const now = deps.leaseClock.now();
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const due = await context.runHeartbeatRepository.findDuePending(
				command.limit,
				now,
			);
			const claimed: RunHeartbeat[] = [];
			const budgetStoppedRunIds: string[] = [];
			for (const heartbeat of due) {
				const run = await context.runRepository.findByRunId(heartbeat.runId);
				if (!run) {
					await context.runHeartbeatRepository.save({
						...heartbeat,
						status: "cancelled",
						processedAt: now,
					});
					continue;
				}
				const allowed = await deps.operationalBudget.reserveWakeupUnit(
					run.organizationId,
				);
				if (!allowed) {
					if (
						run.status !== "BUDGET_STOPPED" &&
						canTransitionRunStatus(run.status, "BUDGET_STOPPED")
					) {
						const cancelledHeartbeats =
							await context.runHeartbeatRepository.cancelPendingForRun(
								run.id,
								now,
							);
						const savedRun = await context.runRepository.save({
							...run,
							status: "BUDGET_STOPPED",
							completedAt: now,
							revision: run.revision + 1,
							updatedAt: now,
							waitingHuman: null,
						});
						budgetStoppedRunIds.push(savedRun.id);
						await context.publishEvents([
							createRunBudgetStoppedEvent({
								runId: savedRun.id,
								taskId: savedRun.taskId,
								agentId: savedRun.agentId,
								organizationId: savedRun.organizationId,
								issueIdentifier: savedRun.issueIdentifier,
								runRevision: savedRun.revision,
								cancelledHeartbeats,
								idempotentReplay: false,
							}),
						]);
					}
					await context.runHeartbeatRepository.save({
						...heartbeat,
						status: "cancelled",
						processedAt: now,
					});
					continue;
				}
				const updated = await context.runHeartbeatRepository.save({
					...heartbeat,
					status: "processing",
					attempt: heartbeat.attempt + 1,
				});
				claimed.push(updated);
			}
			return { heartbeats: claimed, budgetStoppedRunIds };
		},
	);
}
