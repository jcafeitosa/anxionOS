import type { Goal } from "../entities/goal";
export interface GoalRepository {
    save(goal: Goal): Promise<Goal>;
    findById(organizationId: string, goalId: string): Promise<Goal | null>;
    listByOrganization(organizationId: string): Promise<Goal[]>;
}
