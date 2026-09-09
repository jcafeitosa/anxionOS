import type { GateId, HierarchyMode } from "@anxionos/contracts/orchestration";
import type { GraphQueryPort } from "../../domain/ports/graph-query";
import type { OrganizationScopePort } from "../../domain/ports/organization-scope";

export interface HierarchyModeResolverDeps {
    organizationScope: OrganizationScopePort;
    graphQuery?: GraphQueryPort;
}
export interface HierarchyModeResolution {
    hierarchyMode: HierarchyMode;
    escalationPathComplete?: boolean;
}

    agentId: string;
    gateId: GateId;
}): Promise<HierarchyModeResolution>;

const CIRCULAR_ESCALATION_GATES = ["G4", "G5"];
export async function resolveHierarchyModeForGate(deps, input) {
    await deps.organizationScope.assertActive(input.organizationId);
    const hierarchyMode = await deps.organizationScope.getHierarchyMode(input.organizationId);
    if (hierarchyMode === "HIERARCHY_CIRCULAR" &&
        deps.graphQuery &&
        CIRCULAR_ESCALATION_GATES.includes(input.gateId)) {
        const path = await deps.graphQuery.explainEscalationPath(input.agentId, input.organizationId);
        return {
            hierarchyMode,
            escalationPathComplete: path.complete,
        };
    }
    return { hierarchyMode };
}
