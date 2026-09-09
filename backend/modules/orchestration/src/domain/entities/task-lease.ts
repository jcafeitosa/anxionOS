import { timingSafeEqual } from "node:crypto";

export const DEFAULT_LEASE_TTL_MS: number;
export const MAX_LEASE_TTL_MS: number;
export interface TaskLease {
    id: string;
    taskId: string;
    runId: string;
    agentId: string;
    leaseToken: string;
    leasedAt: Date;
    expiresAt: Date;
    heartbeatDueAt: Date | null;
    releasedAt: Date | null;
    createdAt: Date;
}
export interface NewTaskLease {
    taskId: string;
    runId: string;
    agentId: string;
    leaseToken: string;
    leasedAt: Date;
    expiresAt: Date;
    heartbeatDueAt?: Date | null;
}

export const DEFAULT_LEASE_TTL_MS = 4 * 60 * 60 * 1000;
export const MAX_LEASE_TTL_MS = 8 * 60 * 60 * 1000;
export function isLeaseActive(lease: TaskLease, now: Date): boolean {
    if (lease.releasedAt !== null) {
        return false;
    }
    return lease.expiresAt > now;
}
export function leaseTokensMatch(expected: string, actual: string): boolean {
    if (expected.length !== actual.length) {
        return false;
    }
    return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
}
