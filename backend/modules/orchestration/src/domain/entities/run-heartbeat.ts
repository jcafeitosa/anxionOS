import type { HeartbeatStatus } from "@anxionos/contracts/orchestration";

export interface RunHeartbeat {
	id: string;
	runId: string;
	taskId: string;
	agentId: string;
	coalesceKey: string;
	nextWakeAt: Date;
	status: HeartbeatStatus;
	attempt: number;
	createdAt: Date;
	processedAt: Date | null;
}
export interface NewRunHeartbeat {
	runId: string;
	taskId: string;
	agentId: string;
	coalesceKey: string;
	nextWakeAt: Date;
	status?: HeartbeatStatus;
}

export const HEARTBEAT_COALESCE_WINDOW_MS = 30_000;
export function buildHeartbeatCoalesceKey(
	taskId: string,
	agentId: string,
): string {
	return `${taskId}:${agentId}`;
}
