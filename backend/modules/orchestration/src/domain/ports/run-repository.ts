import type { Run } from "../entities/run";
export interface RunRepository {
    save(run: Run): Promise<Run>;
    findById(organizationId: string, runId: string): Promise<Run | null>;
    findActiveByTaskAndAgent(organizationId: string, taskId: string, agentId: string): Promise<Run | null>;
}
