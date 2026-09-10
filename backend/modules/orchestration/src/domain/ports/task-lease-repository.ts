import type { TaskLease } from "../entities/task-lease";
export interface ExpiredActiveLease extends TaskLease {
	organizationId: string;
}
export interface TaskLeaseRepository {
	save(lease: TaskLease): Promise<TaskLease>;
	findActiveByTaskId(taskId: string): Promise<TaskLease | null>;
	findByTaskIdAndToken(
		taskId: string,
		leaseToken: string,
	): Promise<TaskLease | null>;
	findExpiredActive(before: Date, limit: number): Promise<ExpiredActiveLease[]>;
}
