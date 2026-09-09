import type { HierarchyMode } from "@anxionos/contracts/orchestration";

export type OrganizationMembershipRole = "member" | "admin" | "owner";
export interface OrganizationScopePort {
    assertActive(organizationId: string): Promise<void>;
    assertMembership(principalId: string, organizationId: string, minRole?: OrganizationMembershipRole): Promise<void>;
    getHierarchyMode(organizationId: string): Promise<HierarchyMode>;
}

export class OrganizationScopeDeniedError extends Error {
    constructor(message = "Organization scope denied", options) {
        super(message, options);
        this.name = "OrganizationScopeDeniedError";
    }
}
