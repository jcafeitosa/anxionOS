import { describe, expect, test } from "bun:test";
import type { createOrganizationsDb } from "@anxionos/organizations";
import type { Pool } from "pg";
import { createOrganizationsMembershipReadAdapter } from "../../apps/api/src/governance/organizations-membership-read-adapter";

/**
 * S4b (ANX-460) — o read model de membership consumido pelo `governance` precisa
 * **expor** memberships sem principal.
 *
 * Defeito original: `mapMembershipRow` e o ramo via repositorio devolviam `null`
 * quando `principal_id` era nulo. Com isso o consumer tratava "convite pendente"
 * como "membership inexistente", `assertMembershipMatchesRevokedPayload` falhava
 * em `!membership` e o evento `membership.revoked.v1` de um convite cancelado era
 * rejeitado **para sempre** — o stream nunca convergia.
 */
const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const membershipId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type OrganizationsDb = ReturnType<typeof createOrganizationsDb>;

function stubOrgsDb(
	membership: {
		agencyId: string;
		id: string;
		principalId: string | null;
		role: "owner" | "admin" | "operator" | "viewer";
		status: "invited" | "active" | "revoked";
	} | null,
): OrganizationsDb {
	return {
		membershipRepository: {
			async findById() {
				return membership;
			},
		},
	} as unknown as OrganizationsDb;
}

function stubPool(
	row: {
		id: string;
		agency_id: string;
		principal_id: string | null;
		role: string;
		status: string;
	} | null,
): Pool {
	return {
		async query() {
			return { rows: row ? [row] : [] };
		},
	} as unknown as Pool;
}

describe("organizations membership read adapter", () => {
	test("expoe convite pendente com principalId null (ramo repositorio)", async () => {
		const adapter = createOrganizationsMembershipReadAdapter(
			stubOrgsDb({
				agencyId,
				id: membershipId,
				principalId: null,
				role: "admin",
				status: "revoked",
			}),
		);

		const snapshot = await adapter.findMembership(agencyId, membershipId);
		expect(snapshot).not.toBeNull();
		expect(snapshot?.membershipId).toBe(membershipId);
		expect(snapshot?.principalId).toBeNull();
		expect(snapshot?.status).toBe("revoked");
	});

	test("expoe convite pendente com principalId null (ramo SQL FOR SHARE)", async () => {
		const adapter = createOrganizationsMembershipReadAdapter(stubOrgsDb(null));

		const snapshot = await adapter.findMembership(agencyId, membershipId, {
			transactionClient: {
				async query() {
					return {
						rows: [
							{
								id: membershipId,
								agency_id: agencyId,
								principal_id: null,
								role: "admin",
								status: "revoked",
							},
						],
					};
				},
			} as never,
		});
		expect(snapshot).not.toBeNull();
		expect(snapshot?.principalId).toBeNull();
	});

	test("devolve null apenas quando a membership nao existe", async () => {
		const adapter = createOrganizationsMembershipReadAdapter(stubOrgsDb(null));
		expect(await adapter.findMembership(agencyId, membershipId)).toBeNull();

		const sqlAdapter = createOrganizationsMembershipReadAdapter(
			stubOrgsDb(null),
		);
		expect(
			await sqlAdapter.findMembership(agencyId, membershipId, {
				transactionClient: stubPool(null),
			}),
		).toBeNull();
	});

	test("preserva o principal quando a membership foi ativada", async () => {
		const adapter = createOrganizationsMembershipReadAdapter(
			stubOrgsDb({
				agencyId,
				id: membershipId,
				principalId: "11111111-1111-4111-8111-111111111111",
				role: "owner",
				status: "active",
			}),
		);
		const snapshot = await adapter.findMembership(agencyId, membershipId);
		expect(snapshot?.principalId).toBe("11111111-1111-4111-8111-111111111111");
	});
});
