import type { AcknowledgeRunHeartbeatCommand } from "@anxionos/contracts/orchestration";
import { acknowledgeRunHeartbeatCommandSchema } from "@anxionos/contracts/orchestration";
import type { LeaseClock } from "../../domain/ports/lease-clock";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import { throwOrchestrationError } from "../errors";

export interface AcknowledgeRunHeartbeatResult {
	heartbeatId: string;
	processedAt: string;
}
export interface AcknowledgeRunHeartbeatDeps {
	unitOfWork: OrchestrationUnitOfWork;
	leaseClock: LeaseClock;
}

export async function acknowledgeRunHeartbeat(
	deps: AcknowledgeRunHeartbeatDeps,
	input: AcknowledgeRunHeartbeatCommand,
): Promise<AcknowledgeRunHeartbeatResult> {
	const command = acknowledgeRunHeartbeatCommandSchema.parse(input);
	const now = deps.leaseClock.now();
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const heartbeat = await context.runHeartbeatRepository.findById(
				command.heartbeatId,
			);
			if (!heartbeat) {
				throwOrchestrationError(
					"ORC_TASK_NOT_FOUND",
					`Heartbeat ${command.heartbeatId} not found`,
				);
			}
			const updated = await context.runHeartbeatRepository.save({
				...heartbeat,
				status: "done",
				processedAt: now,
			});
			return {
				heartbeatId: updated.id,
				processedAt: updated.processedAt?.toISOString() ?? now.toISOString(),
			};
		},
	);
}
