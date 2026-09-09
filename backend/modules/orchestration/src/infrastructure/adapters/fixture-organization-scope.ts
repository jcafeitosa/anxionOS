import type { HierarchyMode } from "@anxionos/contracts/orchestration";
import type { OrganizationScopePort } from "../../domain/ports/organization-scope";

export interface FixtureOrganizationScopeConfig {
    activeOrganizations: Set<string>;
    hierarchyModeByOrganization?: Map<string, HierarchyMode>;
    defaultHierarchyMode?: HierarchyMode;
}

export function createFixtureOrganizationScope(config: FixtureOrganizationScopeConfig): OrganizationScopePort {
    const defaultMode = config.defaultHierarchyMode ?? "HIERARCHY_CIRCULAR";
    return {
        async assertActive(organizationId) {
            if (!config.activeOrganizations.has(organizationId)) {
                throw new Error(`Organization ${organizationId} is not active`);
            }
        },
        async assertMembership() { },
        async getHierarchyMode(organizationId) {
            return (config.hierarchyModeByOrganization?.get(organizationId) ?? defaultMode);
        },
    };
}
