import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createAgency,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
	OrganizationCommandError,
} from "@anxionos/organizations";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	withOrganizationsPgHarness,
} from "../test-support";

/**
 * G2-3 e G2-7/G4-F6 (ANX-460), contra PostgreSQL real.
 *
 * 1) O G2 apontou que a afirmacao "sem double-apply" nao tinha oraculo no repo
 *    para `organizations` (so' no `governance`, ANX-457): o UoW em memoria
 *    serializa e nunca exercita a corrida do journal. Aqui N chamadas reais,
 *    cada uma com sua conexao do pool, disputam a MESMA `Idempotency-Key`.
 * 2) A migration 0005 removeu o UNIQUE de `organizations_owners.principal_id`
 *    e deixou a tabela sem nenhuma unicidade; a 0007 devolve integridade com
 *    UNIQUE (tenant_id, principal_id).
 */
describe("organizations journal sob concorrencia real (PG)", () => {
	test("12 comandos simultaneos com a MESMA Idempotency-Key: 1 aplica, 11 sao 409, zero double-apply", async () => {
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
			const commandId = randomUUID();
			const CONCURRENCY = 12;

			const results = await Promise.allSettled(
				Array.from({ length: CONCURRENCY }, () =>
					createAgency(deps, {
						commandId,
						displayName: "Concurrent Agency",
						marketScope: "both",
						ownerPrincipalId,
					}),
				),
			);

			const fulfilled = results.filter(
				(
					result,
				): result is PromiseFulfilledResult<
					Awaited<ReturnType<typeof createAgency>>
				> => result.status === "fulfilled",
			);
			const rejected = results.filter(
				(result): result is PromiseRejectedResult =>
					result.status === "rejected",
			);

			// A INVARIANTE e' "nenhum double-apply", nao "exatamente um 200": o
			// perdedor que chega depois do commit do vencedor resolve o replay
			// legitimamente (`idempotentReplay: true`, mesmo aggregateId) e o que
			// disputa a insercao do journal leva 409. Os dois desfechos sao
			// corretos; o que nao pode existir e' mais de uma APLICACAO.
			const applied = fulfilled.filter(
				(result) => result.value.idempotentReplay !== true,
			);
			const replayed = fulfilled.filter(
				(result) => result.value.idempotentReplay === true,
			);
			expect(applied).toHaveLength(1);
			expect(applied.length + replayed.length).toBe(fulfilled.length);

			// Todo replay devolve o MESMO agregado do vencedor.
			const winnerAggregateId = applied[0].value.aggregateId;
			for (const replay of replayed) {
				expect(replay.value.aggregateId).toBe(winnerAggregateId);
			}

			// Todo rejeitado e' o codigo institucional, nunca 500.
			for (const rejection of rejected) {
				expect(rejection.reason).toBeInstanceOf(OrganizationCommandError);
				expect(
					(rejection.reason as OrganizationCommandError).organizationCode,
				).toBe("ORG_DUPLICATE_IDEMPOTENCY");
				expect((rejection.reason as OrganizationCommandError).statusCode).toBe(
					409,
				);
			}
			// Todos os 12 desfechos explicados.
			expect(fulfilled.length + rejected.length).toBe(CONCURRENCY);

			// Estado final: nenhum efeito duplicado.
			const agencies = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_agencies WHERE owner_principal_id = $1",
				[ownerPrincipalId],
			);
			expect(agencies.rows[0]?.count).toBe(1);
			const journal = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_command_journal WHERE command_id = $1",
				[commandId],
			);
			expect(journal.rows[0]?.count).toBe(1);
			const memberships = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_memberships WHERE agency_id = $1",
				[winnerAggregateId],
			);
			expect(memberships.rows[0]?.count).toBe(1);
		});
	});

	test("mesma key com payload divergente em paralelo: 1 aplica, o outro e' 409", async () => {
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
			const commandId = randomUUID();

			const results = await Promise.allSettled([
				createAgency(deps, {
					commandId,
					displayName: "Payload A",
					marketScope: "both",
					ownerPrincipalId,
				}),
				createAgency(deps, {
					commandId,
					displayName: "Payload B",
					marketScope: "crypto",
					ownerPrincipalId,
				}),
			]);

			const fulfilled = results.filter((r) => r.status === "fulfilled");
			const rejected = results.filter(
				(r): r is PromiseRejectedResult => r.status === "rejected",
			);
			expect(fulfilled).toHaveLength(1);
			expect(rejected).toHaveLength(1);
			expect(
				(rejected[0].reason as OrganizationCommandError).organizationCode,
			).toBe("ORG_DUPLICATE_IDEMPOTENCY");

			const agencies = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_agencies WHERE owner_principal_id = $1",
				[ownerPrincipalId],
			);
			expect(agencies.rows[0]?.count).toBe(1);
		});
	});
});

describe("organizations_owners unicidade por (tenant, principal) — migration 0007", () => {
	test("o indice existe no banco apos o bootstrap", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const indexes = await pool.query<{ indexname: string }>(
				"SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'organizations_owners'",
			);
			const names = indexes.rows.map((row) => row.indexname);
			expect(names).toContain("organizations_owners_tenant_principal_uidx");
			// O indice antigo (principal unico na plataforma) segue removido.
			expect(names).not.toContain("organizations_owners_principal_id_unique");
			expect(names).toContain("organizations_owners_principal_id_idx");
		});
	});

	test("duas linhas de owner para o MESMO (tenant, principal) sao rejeitadas", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const tenantId = randomUUID();
			const principalId = randomUUID();

			await expect(
				pool.query(
					`INSERT INTO organizations_owners (id, tenant_id, agency_id, principal_id)
					 VALUES ($1, $2, $2, $3), ($4, $2, $2, $3)`,
					[randomUUID(), tenantId, principalId, randomUUID()],
				),
			).rejects.toThrow(/organizations_owners_tenant_principal_uidx/);
		});
	});

	test("o MESMO principal em DUAS agencies continua permitido (N Agencies por Owner)", async () => {
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
				displayName: "Agency One",
				marketScope: "both",
				ownerPrincipalId,
			});
			const second = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Agency Two",
				marketScope: "stocks",
				ownerPrincipalId,
			});
			expect(second.aggregateId).not.toBe(first.aggregateId);

			// Uma linha por agency (tenant distinto) para o mesmo principal.
			const owners = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_owners WHERE principal_id = $1",
				[ownerPrincipalId],
			);
			expect(owners.rows[0]?.count).toBe(2);
		});
	});
});
