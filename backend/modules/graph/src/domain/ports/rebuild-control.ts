export type RebuildJobStatus = "pending" | "draining" | "rebuilding" | "verifying" | "completed" | "failed";
export interface RebuildJob {
    jobId: string;
    status: RebuildJobStatus;
    targetGeneration: number;
    cutoffCheckpoint: number;
    ownerDomainOrder: readonly string[];
    registryGeneration: number;
    auditManifestId?: string;
}
export interface CreateRebuildJobInput {
    targetGeneration: number;
    cutoffCheckpoint: number;
    ownerDomainOrder: readonly string[];
    registryGeneration: number;
    auditManifestId?: string;
}
/** Port for full generation swap rebuild worker (S5 implementation). */
export interface RebuildControl {
    getCurrentGeneration(): Promise<number>;
    getProjectionGeneration(consumerName: string): Promise<number>;
    createRebuildJob(input: CreateRebuildJobInput): Promise<RebuildJob>;
    updateJobStatus(jobId: string, status: RebuildJobStatus): Promise<void>;
}
