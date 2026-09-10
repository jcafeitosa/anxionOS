import type { TaskDto } from "@anxionos/contracts/orchestration";
import type { TaskLeaseRepository } from "../../domain/ports/task-lease-repository";
import type { TaskRepository } from "../../domain/ports/task-repository";
import { toTaskDto } from "../dto-mappers";
import { throwOrchestrationError } from "../errors";

export interface GetTaskDeps {
	taskRepository: TaskRepository;
	taskLeaseRepository: TaskLeaseRepository;
}
export interface GetTaskInput {
	organizationId: string;
	taskId: string;
}

export async function getTask(
	deps: GetTaskDeps,
	input: GetTaskInput,
): Promise<TaskDto> {
	const task = await deps.taskRepository.findById(
		input.organizationId,
		input.taskId,
	);
	if (!task) {
		throwOrchestrationError(
			"ORC_TASK_NOT_FOUND",
			`Task ${input.taskId} not found`,
		);
	}
	const lease = await deps.taskLeaseRepository.findActiveByTaskId(input.taskId);
	return toTaskDto(task, lease);
}
