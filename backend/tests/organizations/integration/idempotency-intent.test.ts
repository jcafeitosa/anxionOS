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
 * S2 (ANX-460) contra PostgreSQL real: prova que o journal Drizzle persiste o
 * `request_hash`, que o replay da mesma intencao devolve o MESMO aggregateId e
 * que o reuso divergente da `Idempotency-Key` e' 409 com zero escrita.
 */
describe("organizations idempotency intent (PG integration)", () => {
	test("same key replays; divergent payload is 409 with zero writes", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const commandId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
			};

			const first = await createAgency(deps, {
				commandId,
				displayName: "Idempotent Agency",
				marketScope: "both",
				ownerPrincipalId,
			});
			const replay = await createAgency(deps, {
				commandId,
				displayName: "Idempotent Agency",
				marketScope: "both",
				ownerPrincipalId,
			});
			expect(replay.aggregateId).toBe(first.aggregateId);
			expect(replay.idempotentReplay).toBe(true);

			await expect(
				createAgency(deps, {
					commandId,
					displayName: "Divergent Agency",
					marketScope: "both",
					ownerPrincipalId,
				}),
			).rejects.toMatchObject({
				organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
				statusCode: 409,
			});

			const agencies = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_agencies WHERE owner_principal_id = $1",
				[ownerPrincipalId],
			);
			expect(agencies.rows[0]?.count).toBe(1);

			const journal = await pool.query(
				"SELECT request_hash FROM organizations_command_journal WHERE command_id = $1",
				[commandId],
			);
			expect(typeof journal.rows[0]?.request_hash).toBe("string");
		});
	});
});
