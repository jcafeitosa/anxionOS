import type { RecoveryTaskSnapshot } from "@anxionos/contracts/operations";
import { recoveryTaskSnapshotSchema } from "@anxionos/contracts/operations";
import type { RecoveryTaskRepository } from "../../domain/ports/operations-unit-of-work";
import { throwOperationsError } from "../errors";

export interface GetRecoveryTaskDeps {
	recoveryTasks: RecoveryTaskRepository;
}

function toRecoveryTaskSnapshot(
	record: Awaited<
		ReturnType<RecoveryTaskRepository["findByOrganizationAndId"]>
	>,
): RecoveryTaskSnapshot {
	if (!record) {
		throwOperationsError(
			"OPS_RECOVERY_TASK_NOT_FOUND",
			"recovery task not found",
		);
	}
	return recoveryTaskSnapshotSchema.parse({
		recoveryTaskId: record.id,
		organizationId: record.organizationId,
		incidentId: record.incidentId,
		stepKind: record.stepKind,
		status: record.status,
		stepRequiresApproval: record.stepRequiresApproval,
		hasRequiredApproval: record.hasRequiredApproval,
		startedAt: record.startedAt,
		revision: record.revision,
		initiatedByPrincipalId: record.initiatedByPrincipalId,
	});
}

export async function getRecoveryTask(
	deps: GetRecoveryTaskDeps,
	organizationId: string,
	recoveryTaskId: string,
): Promise<RecoveryTaskSnapshot> {
	const record = await deps.recoveryTasks.findByOrganizationAndId(
		organizationId,
		recoveryTaskId,
	);
	if (!record) {
		throwOperationsError(
			"OPS_RECOVERY_TASK_NOT_FOUND",
			"recovery task not found",
		);
	}
	return toRecoveryTaskSnapshot(record);
}
