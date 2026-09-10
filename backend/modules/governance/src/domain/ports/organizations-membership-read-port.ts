import type {
	MembershipRole,
	MembershipStatus,
} from "@anxionos/contracts/organizations";
import type { PoolClient } from "pg";

export interface OrganizationsMembershipSnapshot {
	agencyId: string;
	membershipId: string;
	principalId: string;
	role: MembershipRole;
	status: MembershipStatus;
}

export interface OrganizationsMembershipReadOptions {
	/** When set, read uses this PG connection inside the caller transaction (FOR SHARE). */
	transactionClient?: PoolClient;
}

export interface OrganizationsMembershipReadPort {
	findMembership(
		agencyId: string,
		membershipId: string,
		options?: OrganizationsMembershipReadOptions,
	): Promise<OrganizationsMembershipSnapshot | null>;
}
