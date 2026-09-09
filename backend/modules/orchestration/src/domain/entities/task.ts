import type { CheckoutStatus } from "@anxionos/contracts/orchestration";
import type { TaskLease } from "./task-lease";
import { isLeaseActive } from "./task-lease";

export interface Task {
    id: string;
    organizationId: string;
    goalId: string;
    goalAncestry: string[];
    parentTaskId: string | null;
    issueIdentifier: string;
    title: string;
    checkoutStatus: CheckoutStatus;
    revision: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface TaskWithLease extends Task {
    lease: TaskLease | null;
}
export interface NewTask {
    organizationId: string;
    goalId: string;
    goalAncestry: string[];
    parentTaskId?: string | null;
    issueIdentifier: string;
    title: string;
    checkoutStatus?: CheckoutStatus;
}

const CHECKOUT_STATUS_TRANSITIONS = {
    UNCLAIMED: ["LEASED", "BLOCKED"],
    LEASED: ["UNCLAIMED", "COMPLETED", "BLOCKED"],
    COMPLETED: [],
    BLOCKED: ["UNCLAIMED"],
};
export function canTransitionCheckoutStatus(from: CheckoutStatus, to: CheckoutStatus): boolean {
    if (from === to) {
        return true;
    }
    return CHECKOUT_STATUS_TRANSITIONS[from].includes(to);
}
export function assertTaskInvariants(task: Task): void {
    if (!/^ANX-[0-9]+$/.test(task.issueIdentifier)) {
        throw new Error("Task issueIdentifier must match ANX-<N>");
    }
    if (task.goalAncestry.length === 0) {
        throw new Error("Task goalAncestry must not be empty");
    }
}
export function assertSingleActiveLease(lease: TaskLease | null, now: Date): void {
    if (lease && isLeaseActive(lease, now)) {
        return;
    }
}
