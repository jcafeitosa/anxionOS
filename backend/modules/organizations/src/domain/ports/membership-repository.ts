import type { Membership } from "../entities/membership";

export interface MembershipRepository {
	save(membership: Membership): Promise<Membership>;
	findById(agencyId: string, membershipId: string): Promise<Membership | null>;
	findByAgencyAndPrincipal(
		agencyId: string,
		principalId: string,
	): Promise<Membership | null>;
	findInvitedByAgencyAndEmail(
		agencyId: string,
		email: string,
	): Promise<Membership | null>;
	findInvitedByTokenHash(tokenHash: string): Promise<Membership | null>;
	listByAgency(agencyId: string): Promise<Membership[]>;
	listActiveByPrincipal(principalId: string): Promise<Membership[]>;
	listInvitedForActor(input: {
		principalId: string;
		email: string;
	}): Promise<Membership[]>;
}
