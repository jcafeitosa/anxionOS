import type {
	MembershipRole,
	MembershipStatus,
} from "@anxionos/contracts/organizations";
import type {
	OrganizationsMembershipReadOptions,
	OrganizationsMembershipReadPort,
} from "@anxionos/governance";
import type { createOrganizationsDb } from "@anxionos/organizations";

type OrganizationsDb = ReturnType<typeof createOrganizationsDb>;

const MEMBERSHIP_SELECT_FOR_SHARE = `
	SELECT id, agency_id, principal_id, role, status
	FROM organizations_memberships
	WHERE agency_id = $1 AND id = $2
	FOR SHARE
`;

type MembershipRow = {
	id: string;
	agency_id: string;
	principal_id: string | null;
	role: MembershipRole;
	status: MembershipStatus;
};

/**
 * Mapeia a linha sem esconder membership sem principal. Devolver `null` quando
 * `principal_id` e' nulo fazia o consumer tratar "convite pendente" como
 * "membership inexistente" e rejeitar `membership.revoked.v1` de convite
 * cancelado para sempre (S4b/ANX-460). `principalId: null` e' o fato.
 */
function mapMembershipRow(row: MembershipRow) {
	return {
		agencyId: row.agency_id,
		membershipId: row.id,
		principalId: row.principal_id,
		role: row.role,
		status: row.status,
	};
}

export function createOrganizationsMembershipReadAdapter(
	orgsDb: OrganizationsDb,
): OrganizationsMembershipReadPort {
	return {
		async findMembership(
			agencyId,
			membershipId,
			options?: OrganizationsMembershipReadOptions,
		) {
			if (options?.transactionClient) {
				const result = await options.transactionClient.query<MembershipRow>(
					MEMBERSHIP_SELECT_FOR_SHARE,
					[agencyId, membershipId],
				);
				const row = result.rows[0];
				return row ? mapMembershipRow(row) : null;
			}

			const membership = await orgsDb.membershipRepository.findById(
				agencyId,
				membershipId,
			);
			if (!membership) {
				return null;
			}
			return {
				agencyId: membership.agencyId,
				membershipId: membership.id,
				principalId: membership.principalId,
				role: membership.role,
				status: membership.status,
			};
		},
	};
}
