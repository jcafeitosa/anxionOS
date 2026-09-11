import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	PLATFORM_CONSOLE_CAPABILITY,
	PLATFORM_SCOPE_ID,
} from "@anxionos/contracts/governance";
import {
	createGovernanceDb,
	createGovernanceUnitOfWork,
	hasPlatformConsoleGrant,
	issueGrant,
} from "@anxionos/governance";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	assertPgIntegrationEnvForCi,
	getDatabaseUrl,
	getPgIntegrationTestSkipReason,
	withGovernancePgHarness,
} from "../test-support";

assertPgIntegrationEnvForCi();
const skipReason = getPgIntegrationTestSkipReason();

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const granteePrincipalId = "11111111-1111-4111-8111-111111111111";

/**
 * ANX-462 — prova contra PostgreSQL real, nao apenas em memoria:
 *
 * 1. o escopo de plataforma e' emitivel e autoriza o console de PLATAFORMA;
 * 2. `console.platform` com escopo de AGENCIA e' recusado (era o exploit: um
 *    operador de agencia emitia a capability no proprio escopo e abria o
 *    console de plataforma);
 * 3. a migration 0008 deixa o enum `governance_scope_kind` aceitar `platform`.
 */
describe("governance platform scope (ANX-462) contra PostgreSQL real", () => {
	test.skipIf(Boolean(skipReason))(
		"o enum aceita 'platform' apos a migration 0008",
		async () => {
			await withGovernancePgHarness(async ({ pool }) => {
				const labels = await pool.query<{ enumlabel: string }>(
					`SELECT e.enumlabel FROM pg_enum e
					 JOIN pg_type t ON t.oid = e.enumtypid
					 WHERE t.typname = 'governance_scope_kind'
					 ORDER BY e.enumsortorder`,
				);
				expect(labels.rows.map((row) => row.enumlabel)).toContain("platform");
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"grant de plataforma autoriza o console; grant de agencia nao",
		async () => {
			await withGovernancePgHarness(async ({ pool }) => {
				const db = createGovernanceDb(pool);
				const unitOfWork = createGovernanceUnitOfWork(pool);
				const deps = {
					unitOfWork,
					commandJournal: db.commandJournal,
					principalLookup: {
						async exists(id: string) {
							return id === granteePrincipalId;
						},
					},
				};

				// 1) emissao de plataforma: representavel e efetiva
				await issueGrant(deps, {
					commandId: randomUUID(),
					scopeId: PLATFORM_SCOPE_ID,
					scopeKind: "platform",
					granteePrincipalId,
					capability: PLATFORM_CONSOLE_CAPABILITY,
				});
				await expect(
					hasPlatformConsoleGrant(
						{ grantRepository: db.grantRepository },
						granteePrincipalId,
					),
				).resolves.toBe(true);

				// 2) o exploit: capability de plataforma em escopo de agencia
				await expect(
					issueGrant(deps, {
						commandId: randomUUID(),
						scopeId: agencyId,
						granteePrincipalId,
						capability: PLATFORM_CONSOLE_CAPABILITY,
					}),
				).rejects.toMatchObject({
					governanceCode: "GOV_CAPABILITY_SCOPE_MISMATCH",
				});

				const agencyGrants = await pool.query<{ count: string }>(
					"SELECT COUNT(*)::text AS count FROM governance_grants WHERE scope_id = $1",
					[agencyId],
				);
				expect(agencyGrants.rows[0]?.count).toBe("0");
			});
		},
	);
});
