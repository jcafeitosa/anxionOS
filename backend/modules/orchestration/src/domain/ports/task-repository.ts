import type { Task, TaskWithLease } from "../entities/task";
export interface TaskRepository {
    save(task: Task): Promise<Task>;
    findById(organizationId: string, taskId: string): Promise<Task | null>;
    findByIdForUpdate(organizationId: string, taskId: string): Promise<TaskWithLease | null>;
    findByIssueIdentifier(organizationId: string, issueIdentifier: string): Promise<Task | null>;
    findByIssueIdentifierOnly(issueIdentifier: string): Promise<Task | null>;
}
