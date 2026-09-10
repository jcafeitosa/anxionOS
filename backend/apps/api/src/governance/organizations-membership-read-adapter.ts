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

function mapMembershipRow(row: MembershipRow) {
	if (!row.principal_id) {
		return null;
	}
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
			if (!membership?.principalId) {
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
