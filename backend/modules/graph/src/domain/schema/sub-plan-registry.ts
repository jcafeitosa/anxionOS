import type { GraphSchemaRegistry } from "./registry";
import { GraphSchemaRegistryError } from "./errors";

function subPlanKey(traversalId, planId) {
    return `${traversalId}:${planId}`;
}
export function createSubPlanRegistry(registry: GraphSchemaRegistry): SubPlanRegistry {
    const plans = new Map();
    const register = (plan) => {
        const key = subPlanKey(plan.traversalId, plan.planId);
        if (plans.has(key)) {
            throw new GraphSchemaRegistryError("DUPLICATE_SUBPLAN", `Sub-plan already registered: ${plan.traversalId}/${plan.planId}`);
        }
        try {
            registry.validateEdgeAllowlist(plan.edgeAllowlist);
        }
        catch (error) {
            if (error instanceof GraphSchemaRegistryError) {
                throw new GraphSchemaRegistryError("SUBPLAN_EDGE_NOT_REGISTERED", `Sub-plan ${plan.planId} references unregistered edge in allowlist: ${error.message}`, { cause: error });
            }
            throw error;
        }
        const registered = {
            ...plan,
            registeredAt: new Date(),
        };
        plans.set(key, registered);
        return registered;
    };
    const require = (traversalId, planId) => {
        const plan = plans.get(subPlanKey(traversalId, planId));
        if (!plan) {
            throw new GraphSchemaRegistryError("TRAVERSAL_NOT_REGISTERED", `Sub-plan not registered: ${traversalId}/${planId}`);
        }
        return plan;
    };
    return {
        register,
        get(traversalId, planId) {
            return plans.get(subPlanKey(traversalId, planId));
        },
        require,
        list() {
            return [...plans.values()];
        },
    };
}

export interface TraversalSubPlanRegistration {
    traversalId: string;
    planId: string;
    ownerDomain: string;
    edgeAllowlist: readonly string[];
}

export interface TraversalSubPlan extends TraversalSubPlanRegistration {
    registeredAt: Date;
}

export interface SubPlanRegistry {
    register(plan: TraversalSubPlanRegistration): TraversalSubPlan;
    get(traversalId: string, planId: string): TraversalSubPlan | undefined;
    require(traversalId: string, planId: string): TraversalSubPlan;
    list(): TraversalSubPlan[];
}
