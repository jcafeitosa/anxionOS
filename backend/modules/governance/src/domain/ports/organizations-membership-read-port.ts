import type {
	MembershipRole,
	MembershipStatus,
} from "@anxionos/contracts/organizations";
import type { PoolClient } from "pg";

export interface OrganizationsMembershipSnapshot {
	agencyId: string;
	membershipId: string;
	/**
	 * `null` enquanto a membership nunca foi ativada (convite pendente). O read
	 * model precisa **expor** essa linha — e nao esconde-la atras de um `null` de
	 * "nao encontrada" — para que `membership.revoked.v1` de um convite pendente
	 * possa ser revalidado contra o fato persistido (S4b/ANX-460).
	 */
	principalId: string | null;
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
