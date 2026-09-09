import type { GoalStatus } from "@anxionos/contracts/orchestration";

export interface Goal {
    id: string;
    organizationId: string;
    parentGoalId: string | null;
    title: string;
    priority: number;
    status: GoalStatus;
    revision: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface NewGoal {
    organizationId: string;
    parentGoalId?: string | null;
    title: string;
    priority?: number;
    status?: GoalStatus;
}

const GOAL_STATUS_TRANSITIONS = {
    draft: ["active", "archived"],
    active: ["completed", "archived"],
    completed: ["archived"],
    archived: [],
};
export function canTransitionGoalStatus(from: GoalStatus, to: GoalStatus): boolean {
    if (from === to) {
        return true;
    }
    return GOAL_STATUS_TRANSITIONS[from].includes(to);
}
