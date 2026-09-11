import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createAgency,
	createHmacInviteTokenHasher,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
	inviteMember,
	OrganizationCommandError,
} from "@anxionos/organizations";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	TEST_POOL_APPLICATION_NAME,
	withOrganizationsPgHarness,
} from "../test-support";

/**
 * F-01 dos gates G3/G4/G5 (ANX-460) — corrida de convites duplicados.
 *
 * Dois `InviteMember` simultaneos para o MESMO e-mail na MESMA agency passam pelo
 * `findInvitedByAgencyAndEmail` (read-committed) sem ver o INSERT nao-commitado do
 * vizinho; ambos inserem e o perdedor viola
 * `organizations_memberships_agency_email_invited_uidx`. O `23505` cru subia como
 * **500** porque o `save` do `invite-member` nao passava pelo mapeamento de
 * conflito (o unico dos 8 comandos que ficou de fora).
 *
 * Este e' o oraculo que faltava: o teste de concorrencia anterior
 * (`journal-concurrency.test.ts`) exercitava so' `createAgency`, que nao toca o
 * indice de e-mail. Tres gates reproduziram o defeito por caminhos diferentes
 * (barreira de lock, corrida HTTP direta) e nenhum teste do repo o pegava.
 */
const PEPPER = "organizations-invite-race-pepper";

/**
 * Espera ate' `expected` backends ficarem bloqueados no INSERT de
 * `organizations_memberships` (a barreira de lock). Devolve o maior numero
 * observado; lanca no timeout para o teste falhar alto em vez de passar vazio.
 */
async function waitForBlockedMembershipWrites(
	pool: {
		query: (
			sql: string,
			values?: unknown[],
		) => Promise<{ rows: Array<{ count: number }> }>;
	},
	applicationName: string,
	expected: number,
	timeoutMs: number,
): Promise<number> {
	const deadline = Date.now() + timeoutMs;
	let observed = 0;
	for (;;) {
		const { rows } = await pool.query(
			// Escopado ao NOSSO pool (`application_name`): sem isso o contador e'
			// global e sob execucao paralela outro arquivo pode satisfaze-lo (INFO
			// do G5).
			`SELECT count(*)::int AS count FROM pg_stat_activity
			 WHERE wait_event_type = 'Lock'
			   AND state = 'active'
			   AND datname = current_database()
			   AND application_name = $1
			   AND query ILIKE '%organizations_memberships%'`,
			[applicationName],
		);
		observed = rows[0]?.count ?? 0;
		if (observed >= expected) {
			return observed;
		}
		if (Date.now() > deadline) {
			throw new Error(
				`barreira nao formou: esperava ${expected} backends bloqueados, observou ${observed}`,
			);
		}
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
}

describe("convite concorrente contra PostgreSQL real (F-01)", () => {
	test("N convites simultaneos para o mesmo e-mail: 1 vence, o resto e' 409, nunca 500", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const inviteTokenHasher = createHmacInviteTokenHasher(PEPPER);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				inviteTokenHasher,
			};
			const agency = await createAgency(
				{ ...deps },
				{
					commandId: randomUUID(),
					displayName: "Invite Race Agency",
					marketScope: "both",
					ownerPrincipalId,
				},
			);
			const email = "race-invite@example.com";
			const CONCURRENCY = 6;

			// Barreira DETERMINISTICA: `SHARE ROW EXCLUSIVE` conflita com o INSERT
			// (RowExclusive) mas NAO com os SELECTs, entao todos os comandos passam
			// pelo pre-check e param exatamente no INSERT. Sem a barreira a corrida
			// depende do timing e o teste passava mesmo com o defeito presente
			// (verificado: `Promise.allSettled` sozinho dava falso verde).
			const locker = await pool.connect();
			let pending: Array<Promise<unknown>> = [];
			try {
				await locker.query("BEGIN");
				await locker.query(
					"LOCK TABLE organizations_memberships IN SHARE ROW EXCLUSIVE MODE",
				);
				// Keys DIFERENTES: cada requisicao e' um comando distinto disputando o
				// mesmo e-mail, entao a idempotencia nao mascara a corrida.
				pending = Array.from({ length: CONCURRENCY }, () =>
					inviteMember(deps, {
						commandId: randomUUID(),
						agencyId: agency.aggregateId,
						email,
						role: "operator",
						actorPrincipalId: ownerPrincipalId,
					}),
				);
				const blocked = await waitForBlockedMembershipWrites(
					pool,
					TEST_POOL_APPLICATION_NAME,
					CONCURRENCY,
					10_000,
				);
				expect(blocked).toBeGreaterThanOrEqual(CONCURRENCY);
			} finally {
				await locker.query("ROLLBACK").catch(() => undefined);
				locker.release();
			}
			const results = await Promise.allSettled(pending);

			const fulfilled = results.filter(
				(
					result,
				): result is PromiseFulfilledResult<
					Awaited<ReturnType<typeof inviteMember>>
				> => result.status === "fulfilled",
			);
			const rejected = results.filter(
				(result): result is PromiseRejectedResult =>
					result.status === "rejected",
			);

			// Exatamente UM convite e' criado...
			expect(fulfilled).toHaveLength(1);
			// ...e todos os perdedores recebem o codigo institucional, NUNCA 500.
			for (const rejection of rejected) {
				expect(rejection.reason).toBeInstanceOf(OrganizationCommandError);
				expect(
					(rejection.reason as OrganizationCommandError).organizationCode,
				).toBe("ORG_MEMBERSHIP_EXISTS");
				expect((rejection.reason as OrganizationCommandError).statusCode).toBe(
					409,
				);
				// A mensagem tem de vir do mapeamento por CONSTRAINT (indice de convite),
				// nao de outro ramo: sem esta assercao, trocar a mensagem do caminho de
				// corrida deixava a suite verde (LOW-1 do G2).
				expect(
					(rejection.reason as OrganizationCommandError).message,
				).toContain("pending invite");
			}
			expect(fulfilled.length + rejected.length).toBe(CONCURRENCY);

			// Estado final: UM unico convite pendente.
			const invited = await pool.query<{ count: number }>(
				`SELECT count(*)::int AS count FROM organizations_memberships
				 WHERE agency_id = $1 AND status = 'invited' AND lower(invite_email) = $2`,
				[agency.aggregateId, email],
			);
			expect(invited.rows[0]?.count).toBe(1);
		});
	});

	test("a mensagem do conflito fala em convite pendente, nao em vinculo ativo", async () => {
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
				inviteTokenHasher: createHmacInviteTokenHasher(PEPPER),
			};
			const agency = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Invite Message Agency",
				marketScope: "both",
				ownerPrincipalId,
			});
			const email = "duplicate-invite@example.com";
			await inviteMember(deps, {
				commandId: randomUUID(),
				agencyId: agency.aggregateId,
				email,
				role: "operator",
				actorPrincipalId: ownerPrincipalId,
			});

			// Caminho sequencial (pre-check) — a mensagem tem de descrever o conflito
			// real: ja' existe convite pendente, nao "vinculo ativo" (F-2 do G4).
			let caught: unknown;
			try {
				await inviteMember(deps, {
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					email,
					role: "operator",
					actorPrincipalId: ownerPrincipalId,
				});
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(OrganizationCommandError);
			expect((caught as OrganizationCommandError).organizationCode).toBe(
				"ORG_MEMBERSHIP_EXISTS",
			);
			expect(
				(caught as OrganizationCommandError).message.toLowerCase(),
			).toContain("invite");
		});
	});
});
