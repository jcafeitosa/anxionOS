import type { RunHeartbeat } from "../entities/run-heartbeat";
export interface RunHeartbeatRepository {
	save(heartbeat: RunHeartbeat): Promise<RunHeartbeat>;
	findById(heartbeatId: string): Promise<RunHeartbeat | null>;
	findPendingByCoalesceKey(coalesceKey: string): Promise<RunHeartbeat | null>;
	countPendingByOrganization(organizationId: string): Promise<number>;
	findDuePending(limit: number, now: Date): Promise<RunHeartbeat[]>;
	cancelPendingForRun(runId: string, now: Date): Promise<number>;
}
