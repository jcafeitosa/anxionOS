import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createAgency,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
} from "@anxionos/organizations";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	withOrganizationsPgHarness,
} from "../test-support";

/**
 * D-ORG-035 — "Owner pode ter N Agencies". O indice UNIQUE
 * `organizations_owners_principal_id_unique` (migration 0000) tornava o
 * `principal_id` unico na plataforma inteira; a 2a `createAgency` do mesmo Owner
 * estourava `23505` cru -> 500. A migration 0005 troca o UNIQUE por um indice
 * comum. A regra que permanece e' "1 owner ativo por AGENCY", provada pelos
 * membros ativos, nao pela unicidade de `organizations_owners`.
 */
describe("organizations owners multi-agency (PG integration)", () => {
	test("same owner can own two active agencies", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
			};

			const first = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Owner Agency One",
				marketScope: "both",
				ownerPrincipalId,
			});
			const second = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Owner Agency Two",
				marketScope: "both",
				ownerPrincipalId,
			});

			expect(second.aggregateId).not.toBe(first.aggregateId);
			expect(first.idempotentReplay).toBeUndefined();

			const agencies = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_agencies WHERE owner_principal_id = $1",
				[ownerPrincipalId],
			);
			expect(agencies.rows[0]?.count).toBe(2);

			// A regra sobrevive por AGENCY: exatamente 1 owner ativo em cada uma.
			const ownersPerAgency = await pool.query(
				`SELECT agency_id, count(*)::int AS count
				   FROM organizations_memberships
				  WHERE role = 'owner' AND status = 'active' AND agency_id = ANY($1::uuid[])
			  GROUP BY agency_id`,
				[[first.aggregateId, second.aggregateId]],
			);
			expect(ownersPerAgency.rows).toHaveLength(2);
			for (const row of ownersPerAgency.rows) {
				expect(row.count).toBe(1);
			}
		});
	});
});
