import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { OWNER_AUTHORITY_CAPABILITIES } from "@anxionos/contracts/governance";
import {
	createScopedPool,
	type TenantScopedQueryable,
} from "@anxionos/database";
import { createPgPool } from "@anxionos/eventing/postgres";
import { ensureGovernanceSchema, issueGrant } from "@anxionos/governance";
import { createIdentityDb, ensureIdentitySchema } from "@anxionos/identity";
import {
	buildAgencyTenantContext,
	createOrganizationsDb,
	ensureOrganizationsSchema,
} from "@anxionos/organizations";
import { Elysia } from "elysia";
import type { Pool, PoolClient } from "pg";
import {
	createGovernanceApiRuntime,
	type GovernanceApiRuntime,
} from "../../../apps/api/src/governance/bootstrap";
import { createGovernancePlugin } from "../../../apps/api/src/governance/plugin";
import {
	assertPgIntegrationEnvForCi,
	getDatabaseUrl,
	getPgIntegrationTestSkipReason,
} from "../test-support";

/**
 * ANX-457 / FURO 1 e FURO 2 do G5 (revalidacao no digest `1de998aa`).
 *
 * O G5 provou que a correcao da idempotencia do governance resistia ao reuso
 * SEQUENCIAL (7/7) mas nao a CONCORRENCIA: dois `POST /v1/agencies/:id/grants`
 * simultaneos com a MESMA `Idempotency-Key` devolviam 200 e 200 com
 * `aggregateId` diferentes e gravavam DOIS grants ativos. Raiz: o
 * `governance_command_journal` fazia find-then-insert e o perdedor da corrida
 * devolvia a linha alheia sem validar intencao, commitando a escrita duplicada.
 *
 * Este oraculo sobe o boundary Elysia REAL (`app.handle`) sobre PostgreSQL REAL
 * e exige invariantes de seguranca, nao ordem de chegada:
 *
 *   (a) nenhum double-apply — o estado efetivo cresce exatamente 1 por corrida;
 *   (b) todos os 200 de uma corrida carregam o MESMO `aggregateId` (o unico
 *       vencedor) e exatamente um deles e' aplicacao nova (nao-replay);
 *   (c) todo perdedor responde 409 `GOV_DUPLICATE_IDEMPOTENCY` (nunca 500 e
 *       nunca 200 com outro agregado);
 *   (d) FURO 2: `RevokeGrant` e `IssueGrant` simultaneos com a mesma chave nao
 *       deixam o DELETE devolver 200 `idempotentReplay` com o agregado do grant
 *       recem-emitido enquanto o alvo segue ativo.
 *
 * Duas classes de corrida sao exercitadas:
 *
 *   1. NATURAL (`Promise.all`): N chamadas disparadas juntas. Prova que nao ha
 *      double-apply mesmo quando o vencedor ja' commitou antes das demais
 *      leituras (replay legitimo).
 *   2. BARREIRA DETERMINISTICA: uma transacao de teste segura a linha de
 *      `governance_authority_epochs` do escopo com `FOR UPDATE`. Todas as N
 *      chamadas atravessam a leitura do journal (que acontece ANTES do bump do
 *      epoch) e ficam bloqueadas no bump; o teste espera N backends em
 *      `wait_event = Lock` e so' entao libera. Nao ha corrida por `sleep` nem
 *      retry cego: a liberacao e' dirigida pelo estado observado. A UNICA espera
 *      temporal e' o poll limitado de `waitForLockWaiters` (deadline de 15s,
 *      intervalo de 5ms) sobre `pg_stat_activity`, que apenas OBSERVA os
 *      bloqueados — nao repete a operacao nem mascara falha.
 *
 * Rodado ANTES da correcao, as corridas por barreira falhavam exatamente nos
 * invariantes (a)/(b)/(c): 10 respostas 200, 10 grants ativos, 10 linhas de
 * journal.
 */

assertPgIntegrationEnvForCi();
const skipReason = getPgIntegrationTestSkipReason();

const AGENCY_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const OWNER_AUTH_USER_ID = "anx-457-concurrency-owner-auth";
const TARGET_AUTH_USER_ID = "anx-457-concurrency-target-auth";

const TRUNCATE_SQL =
	"TRUNCATE governance_authority_epochs, governance_command_journal, governance_grants, governance_change_proposals, governance_approvals, governance_delegations, governance_mandates, governance_autonomy_assignments, organizations_memberships, organizations_agencies, organizations_owners, identity_sessions, identity_service_credentials, identity_service_identities, identity_principals, domain_journal, outbox RESTART IDENTITY CASCADE";

/**
 * Concorrencia exercitada por corrida. O pool precisa de MAIS conexoes do que
 * transacoes simultaneas: `issueGrant` consulta o principal DENTRO da
 * transacao por outra conexao do MESMO pool. Por isso o teto e' elevado antes
 * de qualquer conexao (`createPgPool` usa o default do pg, `max=10`).
 */
const RACE_CONCURRENCY = 10;
const RACE_ROUNDS = 5;
const POOL_MAX = RACE_CONCURRENCY * 3;

interface Fixture {
	ownerPrincipalId: string;
	targetPrincipalId: string;
}

interface Harness {
	pool: Pool;
	scopedPool: TenantScopedQueryable;
	govRuntime: GovernanceApiRuntime;
	app: Elysia;
}

async function seedOwnerBaseline(
	govRuntime: GovernanceApiRuntime,
	ownerPrincipalId: string,
): Promise<void> {
	for (const capability of OWNER_AUTHORITY_CAPABILITIES) {
		await issueGrant(
			{
				unitOfWork: govRuntime.unitOfWork,
				commandJournal: govRuntime.commandJournal,
				principalLookup: govRuntime.principalLookup,
			},
			{
				commandId: randomUUID(),
				scopeId: AGENCY_ID,
				granteePrincipalId: ownerPrincipalId,
				issuedByPrincipalId: null,
				capability,
			},
		);
	}
}

async function seedFixture(
	pool: Pool,
	scopedPool: TenantScopedQueryable,
	govRuntime: GovernanceApiRuntime,
): Promise<Fixture> {
	const identityDb = createIdentityDb(pool);
	const owner = await identityDb.repository.createIfAbsent({
		authUserId: OWNER_AUTH_USER_ID,
		email: "anx-457-concurrency-owner@example.test",
	});
	const target = await identityDb.repository.createIfAbsent({
		authUserId: TARGET_AUTH_USER_ID,
		email: "anx-457-concurrency-target@example.test",
	});
	if (!owner || !target) {
		throw new Error("ANX-457 concurrency fixture: principals were not created");
	}
	const now = new Date();
	await scopedPool.withContext(
		buildAgencyTenantContext(AGENCY_ID, owner.id),
		async (client) => {
			const orgDb = createOrganizationsDb(client);
			await orgDb.agencyRepository.save({
				id: AGENCY_ID,
				ownerPrincipalId: owner.id,
				displayName: "ANX-457 concurrency fixture agency",
				marketScope: "both",
				status: "draft",
				onboardingStep: "created",
				revision: 1,
				createdAt: now,
				updatedAt: now,
			});
			await orgDb.membershipRepository.save({
				id: randomUUID(),
				agencyId: AGENCY_ID,
				principalId: owner.id,
				inviteEmail: null,
				inviteTokenHash: null,
				inviteExpiresAt: null,
				role: "owner",
				status: "active",
				invitedAt: null,
				joinedAt: now,
				revokedAt: null,
				revision: 1,
				createdAt: now,
				updatedAt: now,
			});
		},
	);
	await seedOwnerBaseline(govRuntime, owner.id);
	return { ownerPrincipalId: owner.id, targetPrincipalId: target.id };
}

function buildHarness(pool: Pool, databaseUrl: string): Harness {
	const orgDb = createOrganizationsDb(pool);
	const govRuntime = createGovernanceApiRuntime(pool);
	const scopedPool = createScopedPool({
		connectionString: databaseUrl,
		max: RACE_CONCURRENCY + 2,
	});
	const auth = {
		api: {
			async getSession({ headers }: { headers: Headers }) {
				const userId = headers.get("x-anx-457-auth-user");
				return userId ? { user: { id: userId } } : null;
			},
		},
	} as never;
	const app = new Elysia().use(
		createGovernancePlugin({
			auth,
			...govRuntime,
			membershipRepository: orgDb.membershipRepository,
			scopedPool,
		}) as never,
	) as unknown as Elysia;
	return { pool, scopedPool, govRuntime, app };
}

function issueGrantRequest(key: string, body: unknown): Request {
	const headers = new Headers();
	headers.set("x-anx-457-auth-user", OWNER_AUTH_USER_ID);
	headers.set("idempotency-key", key);
	headers.set("content-type", "application/json");
	return new Request(`http://127.0.0.1/v1/agencies/${AGENCY_ID}/grants`, {
		method: "POST",
		headers,
		body: JSON.stringify(body),
	});
}

function revokeGrantRequest(key: string, grantId: string): Request {
	const headers = new Headers();
	headers.set("x-anx-457-auth-user", OWNER_AUTH_USER_ID);
	headers.set("idempotency-key", key);
	headers.set("content-type", "application/json");
	return new Request(
		`http://127.0.0.1/v1/agencies/${AGENCY_ID}/grants/${grantId}`,
		{ method: "DELETE", headers, body: JSON.stringify({}) },
	);
}

interface ParsedResponse {
	status: number;
	body: {
		aggregateId?: string;
		idempotentReplay?: boolean;
		error?: { code?: string; details?: { code?: string } };
	};
}

async function parseResponses(
	responses: Response[],
): Promise<ParsedResponse[]> {
	return Promise.all(
		responses.map(async (response) => ({
			status: response.status,
			body: (await response.json()) as ParsedResponse["body"],
		})),
	);
}

async function sendConcurrently(
	app: Elysia,
	requests: Request[],
): Promise<ParsedResponse[]> {
	return parseResponses(
		await Promise.all(requests.map((item) => app.handle(item))),
	);
}

/**
 * Uma transacao de teste segura a linha do epoch do escopo; as N chamadas
 * atravessam a leitura do journal e bloqueiam no bump. Esperamos N backends
 * bloqueados (`wait_event = Lock`) para so' entao liberar a barreira.
 */
async function lockScopeEpoch(pool: Pool): Promise<PoolClient> {
	const blocker = await pool.connect();
	await blocker.query("BEGIN");
	await blocker.query(
		"SELECT 1 FROM governance_authority_epochs WHERE scope_id = $1 FOR UPDATE",
		[AGENCY_ID],
	);
	return blocker;
}

async function waitForLockWaiters(pool: Pool, expected: number): Promise<void> {
	// Poll LIMITADO e observavel sobre `pg_stat_activity`: nao ha primitiva de
	// bloqueio em PostgreSQL que avise "N backends chegaram ao lock" (LISTEN/
	// NOTIFY nao cobre espera por lock), entao a alternativa e' observar o
	// estado. Nao e' retry cego: o deadline de 15s produz falha explicita com a
	// contagem real, e o intervalo de 5ms nao mascara lentidao — apenas evita
	// busy-loop. O caminho testado segue deterministico: quem libera a barreira e'
	// o COMMIT do blocker, nao um `sleep`.
	const deadline = Date.now() + 15_000;
	for (;;) {
		const result = await pool.query<{ waiting: number }>(
			"SELECT COUNT(*)::int AS waiting FROM pg_stat_activity WHERE wait_event_type = 'Lock' AND state = 'active' AND query ILIKE '%governance_authority_epochs%'",
		);
		const waiting = result.rows[0]?.waiting ?? 0;
		if (waiting >= expected) {
			return;
		}
		if (Date.now() > deadline) {
			throw new Error(
				`ANX-457 barrier timeout: ${waiting}/${expected} backends bloqueados no epoch`,
			);
		}
		await Bun.sleep(5);
	}
}

/**
 * Dispara N chamadas, garante que TODAS passaram pela leitura de journal antes
 * de qualquer commit (barreira no bump de epoch) e devolve as respostas.
 */
async function raceBehindEpochBarrier(
	pool: Pool,
	app: Elysia,
	requests: Request[],
): Promise<ParsedResponse[]> {
	const blocker = await lockScopeEpoch(pool);
	try {
		const pending = requests.map((item) => app.handle(item));
		await waitForLockWaiters(pool, requests.length);
		await blocker.query("COMMIT");
		return await parseResponses(await Promise.all(pending));
	} finally {
		blocker.release();
	}
}

async function countActiveGrants(
	pool: Pool,
	principalId: string,
	capability: string,
): Promise<number> {
	const result = await pool.query<{ count: string }>(
		"SELECT COUNT(*)::text AS count FROM governance_grants WHERE grantee_principal_id = $1 AND capability = $2 AND status = 'active'",
		[principalId, capability],
	);
	return Number(result.rows[0]?.count ?? "0");
}

async function countJournalEntries(pool: Pool, commandId: string) {
	const result = await pool.query<{ count: string }>(
		"SELECT COUNT(*)::text AS count FROM governance_command_journal WHERE command_id = $1",
		[commandId],
	);
	return Number(result.rows[0]?.count ?? "0");
}

async function grantRow(
	pool: Pool,
	grantId: string,
): Promise<{ status: string; revision: number } | null> {
	const result = await pool.query<{ status: string; revision: number }>(
		"SELECT status::text AS status, revision FROM governance_grants WHERE id = $1",
		[grantId],
	);
	return result.rows[0] ?? null;
}

async function countJournalEvents(
	pool: Pool,
	eventType: string,
	grantId: string,
): Promise<number> {
	const result = await pool.query<{ count: string }>(
		"SELECT COUNT(*)::text AS count FROM domain_journal WHERE event_type = $1 AND payload->>'grantId' = $2",
		[eventType, grantId],
	);
	return Number(result.rows[0]?.count ?? "0");
}

/**
 * Invariantes de seguranca de uma corrida de EMISSAO: nenhum status fora de
 * {200, 409}; todos os 200 apontam o MESMO agregado; exatamente um 200 e'
 * aplicacao nova; todo 409 e' `GOV_DUPLICATE_IDEMPOTENCY`.
 */
function assertRaceSafe(outcome: ParsedResponse[]): {
	ok: ParsedResponse[];
	conflicts: ParsedResponse[];
} {
	const ok = outcome.filter((item) => item.status === 200);
	const conflicts = outcome.filter((item) => item.status === 409);
	const unexpected = outcome.filter(
		(item) => item.status !== 200 && item.status !== 409,
	);
	if (unexpected.length > 0) {
		throw new Error(
			`ANX-457: respostas fora de {200, 409}: ${JSON.stringify(unexpected)}`,
		);
	}
	const aggregateIds = new Set(ok.map((item) => item.body.aggregateId));
	expect(aggregateIds.size).toBe(1);
	expect(ok.filter((item) => item.body.idempotentReplay !== true).length).toBe(
		1,
	);
	for (const conflict of conflicts) {
		expect(conflict.body.error?.details?.code).toBe(
			"GOV_DUPLICATE_IDEMPOTENCY",
		);
	}
	return { ok, conflicts };
}

/**
 * Invariantes de seguranca de uma corrida de REVOGACAO. A prova de "1
 * revogacao efetiva" e' o estado do banco (1 evento `GRANT_REVOKED` commitado),
 * nao a contagem de 200: o caminho idempotente de grant ja' revogado tambem
 * responde 200. O contrato exigido para o perdedor e' 409
 * `GOV_DUPLICATE_IDEMPOTENCY` — nunca 500 nem 200 com outro agregado.
 */
function assertRevokeRaceSafe(
	outcome: ParsedResponse[],
	grantId: string,
): { ok: ParsedResponse[]; conflicts: ParsedResponse[] } {
	const ok = outcome.filter((item) => item.status === 200);
	const conflicts = outcome.filter((item) => item.status === 409);
	const unexpected = outcome.filter(
		(item) => item.status !== 200 && item.status !== 409,
	);
	if (unexpected.length > 0) {
		throw new Error(
			`ANX-457: respostas fora de {200, 409} na revogacao: ${JSON.stringify(unexpected)}`,
		);
	}
	if (ok.length === 0) {
		throw new Error(
			`ANX-457: nenhuma revogacao bem-sucedida: ${JSON.stringify(outcome)}`,
		);
	}
	for (const response of ok) {
		expect(response.body.aggregateId).toBe(grantId);
	}
	for (const conflict of conflicts) {
		expect(conflict.body.error?.details?.code).toBe(
			"GOV_DUPLICATE_IDEMPOTENCY",
		);
	}
	return { ok, conflicts };
}

async function withHarness(
	work: (ctx: Harness & Fixture) => Promise<void>,
): Promise<void> {
	const url = getDatabaseUrl();
	if (skipReason || !url) {
		return;
	}
	const pool = createPgPool(url);
	// `createPgPool` usa o default do pg (`max=10`). A corrida abre 10
	// transacoes simultaneas e cada uma pede uma SEGUNDA conexao para o lookup
	// de principal DENTRO da transacao; sem teto maior o pool esgotaria. O pg le
	// `options.max` a cada pulsacao, e aqui nada foi aberto ainda.
	pool.options.max = POOL_MAX;
	const harness = buildHarness(pool, url);
	try {
		await ensureIdentitySchema(pool);
		await ensureOrganizationsSchema(pool);
		await ensureGovernanceSchema(pool);
		await pool.query(TRUNCATE_SQL);
		const fixture = await seedFixture(
			pool,
			harness.scopedPool,
			harness.govRuntime,
		);
		await work({ ...harness, ...fixture });
	} finally {
		await harness.scopedPool.end();
		await pool.end();
	}
}

describe("ANX-457 — idempotencia concorrente do governance (PostgreSQL real + app.handle)", () => {
	/**
	 * Corrida NATURAL: 5 rodadas de 10 POST disparados juntos, chave nova por
	 * rodada. Mesmo quando o vencedor ja' commitou, as demais nao podem aplicar
	 * nada: ou sao 409 (perderam a insercao) ou replay legitimo do MESMO
	 * agregado.
	 */
	test.skipIf(Boolean(skipReason))(
		"10 POST simultaneos x 5 rodadas: nenhum double-apply",
		async () => {
			await withHarness(async ({ app, pool, targetPrincipalId }) => {
				for (let round = 0; round < RACE_ROUNDS; round += 1) {
					const key = randomUUID();
					const before = await countActiveGrants(
						pool,
						targetPrincipalId,
						"owner.manage",
					);
					const outcome = await sendConcurrently(
						app,
						Array.from({ length: RACE_CONCURRENCY }, () =>
							issueGrantRequest(key, {
								granteePrincipalId: targetPrincipalId,
								capability: "owner.manage",
							}),
						),
					);
					const after = await countActiveGrants(
						pool,
						targetPrincipalId,
						"owner.manage",
					);
					assertRaceSafe(outcome);

					expect(after - before).toBe(1);
					expect(await countJournalEntries(pool, key)).toBe(1);
				}
			});
		},
	);

	/**
	 * Corrida NATURAL de REVOGACAO: 5 rodadas de 10 DELETE disparados juntos,
	 * chave nova por rodada, cada rodada contra um grant recem-emitido. Prova o
	 * invariante de seguranca: UMA revogacao efetiva por rodada (um unico evento
	 * `GRANT_REVOKED` commitado) e nenhum double-apply. O contrato de status do
	 * perdedor (409 `GOV_DUPLICATE_IDEMPOTENCY`, nunca 500) e' verificado aqui
	 * por `assertRevokeRaceSafe` e no teste dedicado logo abaixo.
	 */
	test.skipIf(Boolean(skipReason))(
		"10 DELETE simultaneos x 5 rodadas: 1 revogacao efetiva (sem double-apply)",
		async () => {
			await withHarness(
				async ({ app, pool, govRuntime, targetPrincipalId }) => {
					for (let round = 0; round < RACE_ROUNDS; round += 1) {
						const issued = await issueGrant(
							{
								unitOfWork: govRuntime.unitOfWork,
								commandJournal: govRuntime.commandJournal,
								principalLookup: govRuntime.principalLookup,
							},
							{
								commandId: randomUUID(),
								scopeId: AGENCY_ID,
								granteePrincipalId: targetPrincipalId,
								issuedByPrincipalId: null,
								capability: "owner.read",
							},
						);
						const key = randomUUID();
						const outcome = await sendConcurrently(
							app,
							Array.from({ length: RACE_CONCURRENCY }, () =>
								revokeGrantRequest(key, issued.aggregateId),
							),
						);
						const row = await grantRow(pool, issued.aggregateId);
						const revokedEvents = await countJournalEvents(
							pool,
							"governance.grant.revoked.v1",
							issued.aggregateId,
						);
						// Invariante de seguranca: uma unica revogacao efetiva.
						expect(row?.status).toBe("revoked");
						expect(row?.revision).toBe(2);
						expect(revokedEvents).toBe(1);
						expect(await countJournalEntries(pool, key)).toBe(1);
						// Nenhum status fora de {200, 409}; todo 200 carrega o alvo.
						assertRevokeRaceSafe(outcome, issued.aggregateId);
					}
				},
			);
		},
	);

	/**
	 * CONTRATO DO PERDEDOR NA REVOGACAO (FURO 2 do G5 r2): toda resposta nao-200
	 * de uma corrida com a MESMA `Idempotency-Key` tem de ser 409
	 * `GOV_DUPLICATE_IDEMPOTENCY` — nunca 500.
	 *
	 * Este teste e' a regressao da classe: os perdedores liam o grant (revision 1)
	 * antes de serializar no bump de epoch e o `save` otimista de
	 * `grant-repository.ts` falhava com `GrantRevisionConflictError` (sem
	 * mapeamento → 500 "Grant revision conflict") ANTES de chegar ao
	 * `recordGovernanceCommand`. Fechado no mesmo passe: `revokeGrant` passou a
	 * RE-LER o grant depois do bump de epoch, entao o perdedor cai no no-op e o
	 * `recordGovernanceCommand` devolve o conflito institucional (409). Verde no
	 * digest atual.
	 */
	test.skipIf(Boolean(skipReason))(
		"perdedores da revogacao sao 409 GOV_DUPLICATE_IDEMPOTENCY (nunca 500)",
		async () => {
			await withHarness(
				async ({ app, pool, govRuntime, targetPrincipalId }) => {
					const issued = await issueGrant(
						{
							unitOfWork: govRuntime.unitOfWork,
							commandJournal: govRuntime.commandJournal,
							principalLookup: govRuntime.principalLookup,
						},
						{
							commandId: randomUUID(),
							scopeId: AGENCY_ID,
							granteePrincipalId: targetPrincipalId,
							issuedByPrincipalId: null,
							capability: "owner.read",
						},
					);
					const key = randomUUID();
					const outcome = await raceBehindEpochBarrier(
						pool,
						app,
						Array.from({ length: RACE_CONCURRENCY }, () =>
							revokeGrantRequest(key, issued.aggregateId),
						),
					);
					const { conflicts } = assertRevokeRaceSafe(
						outcome,
						issued.aggregateId,
					);
					expect(conflicts.length).toBe(RACE_CONCURRENCY - 1);
				},
			);
		},
	);

	/**
	 * BARREIRA DETERMINISTICA (2 chamadas): prova o caminho de conflito — o
	 * perdedor responde 409 `GOV_DUPLICATE_IDEMPOTENCY` e nada e' gravado.
	 */
	test.skipIf(Boolean(skipReason))(
		"2 POST na barreira: 1 aplica, o perdedor e' 409 GOV_DUPLICATE_IDEMPOTENCY",
		async () => {
			await withHarness(async ({ app, pool, targetPrincipalId }) => {
				const key = randomUUID();
				const before = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.manage",
				);
				const outcome = await raceBehindEpochBarrier(
					pool,
					app,
					Array.from({ length: 2 }, () =>
						issueGrantRequest(key, {
							granteePrincipalId: targetPrincipalId,
							capability: "owner.manage",
						}),
					),
				);
				const after = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.manage",
				);
				const { conflicts } = assertRaceSafe(outcome);

				expect(after - before).toBe(1);
				expect(await countJournalEntries(pool, key)).toBe(1);
				expect(conflicts.length).toBe(1);
			});
		},
	);

	/**
	 * BARREIRA DETERMINISTICA (10 chamadas): todas passaram pela leitura do
	 * journal antes de qualquer commit; no maximo UMA aplica, as outras 9
	 * respondem 409.
	 */
	test.skipIf(Boolean(skipReason))(
		"10 POST na barreira: 1 aplica, 9 sao 409",
		async () => {
			await withHarness(async ({ app, pool, targetPrincipalId }) => {
				const key = randomUUID();
				const before = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.manage",
				);
				const outcome = await raceBehindEpochBarrier(
					pool,
					app,
					Array.from({ length: RACE_CONCURRENCY }, () =>
						issueGrantRequest(key, {
							granteePrincipalId: targetPrincipalId,
							capability: "owner.manage",
						}),
					),
				);
				const after = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.manage",
				);
				const { conflicts } = assertRaceSafe(outcome);

				expect(after - before).toBe(1);
				expect(await countJournalEntries(pool, key)).toBe(1);
				expect(conflicts.length).toBe(RACE_CONCURRENCY - 1);
			});
		},
	);

	/**
	 * Payload DIVERGENTE com a mesma chave: deterministico mesmo sem barreira —
	 * um aplica, o outro e' 409 por validacao de intencao ou por colisao de PK.
	 */
	test.skipIf(Boolean(skipReason))(
		"mesma chave com payload divergente em paralelo: um aplica, o outro e' 409",
		async () => {
			await withHarness(async ({ app, pool, targetPrincipalId }) => {
				const key = randomUUID();
				const beforeRead = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.read",
				);
				const beforeManage = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.manage",
				);
				const outcome = await sendConcurrently(app, [
					issueGrantRequest(key, {
						granteePrincipalId: targetPrincipalId,
						capability: "owner.read",
					}),
					issueGrantRequest(key, {
						granteePrincipalId: targetPrincipalId,
						capability: "owner.manage",
					}),
				]);
				const afterRead = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.read",
				);
				const afterManage = await countActiveGrants(
					pool,
					targetPrincipalId,
					"owner.manage",
				);
				expect(outcome.map((item) => item.status).sort()).toEqual([200, 409]);
				const conflict = outcome.find((item) => item.status === 409);
				expect(conflict?.body.error?.details?.code).toBe(
					"GOV_DUPLICATE_IDEMPOTENCY",
				);
				expect(afterRead - beforeRead + (afterManage - beforeManage)).toBe(1);
				expect(await countJournalEntries(pool, key)).toBe(1);
			});
		},
	);

	/**
	 * FURO 2 na BARREIRA: 10 DELETE com todas as chamadas ja' dentro da janela
	 * do journal. O caminho `raced` do `revokeGrant` devolvia snapshot sem
	 * validar intencao e commitava revogacoes duplicadas. Prova de UMA revogacao
	 * efetiva: exatamente 1 evento `GRANT_REVOKED` commitado e o alvo em
	 * `revoked` com revision 2. O contrato de status do perdedor fica no teste
	 * dedicado acima.
	 */
	test.skipIf(Boolean(skipReason))(
		"10 DELETE na barreira: 1 revogacao efetiva e nenhum double-apply",
		async () => {
			await withHarness(
				async ({ app, pool, govRuntime, targetPrincipalId }) => {
					const issued = await issueGrant(
						{
							unitOfWork: govRuntime.unitOfWork,
							commandJournal: govRuntime.commandJournal,
							principalLookup: govRuntime.principalLookup,
						},
						{
							commandId: randomUUID(),
							scopeId: AGENCY_ID,
							granteePrincipalId: targetPrincipalId,
							issuedByPrincipalId: null,
							capability: "owner.read",
						},
					);
					const key = randomUUID();
					const outcome = await raceBehindEpochBarrier(
						pool,
						app,
						Array.from({ length: RACE_CONCURRENCY }, () =>
							revokeGrantRequest(key, issued.aggregateId),
						),
					);
					const row = await grantRow(pool, issued.aggregateId);

					expect(row?.status).toBe("revoked");
					expect(row?.revision).toBe(2);
					// Prova de UMA revogacao efetiva: um unico evento commitado.
					expect(
						await countJournalEvents(
							pool,
							"governance.grant.revoked.v1",
							issued.aggregateId,
						),
					).toBe(1);
					expect(await countJournalEntries(pool, key)).toBe(1);
					expect(
						outcome.filter((item) => item.status === 200).length,
					).toBeGreaterThanOrEqual(1);
					for (const response of outcome.filter(
						(item) => item.status === 200,
					)) {
						expect(response.body.aggregateId).toBe(issued.aggregateId);
					}
				},
			);
		},
	);

	/**
	 * FURO 2, prova direta do achado do G5: `IssueGrant` e `RevokeGrant` na
	 * barreira com a MESMA chave. O teste falha se o DELETE devolver 200
	 * `idempotentReplay` com o agregado do grant recem-emitido enquanto o alvo
	 * segue `active`.
	 */
	test.skipIf(Boolean(skipReason))(
		"IssueGrant e RevokeGrant simultaneos com a mesma chave: um vence, o outro e' 409",
		async () => {
			await withHarness(
				async ({ app, pool, govRuntime, targetPrincipalId }) => {
					const targetGrant = await issueGrant(
						{
							unitOfWork: govRuntime.unitOfWork,
							commandJournal: govRuntime.commandJournal,
							principalLookup: govRuntime.principalLookup,
						},
						{
							commandId: randomUUID(),
							scopeId: AGENCY_ID,
							granteePrincipalId: targetPrincipalId,
							issuedByPrincipalId: null,
							capability: "agents.publish",
						},
					);
					const key = randomUUID();
					const outcome = await raceBehindEpochBarrier(pool, app, [
						issueGrantRequest(key, {
							granteePrincipalId: targetPrincipalId,
							capability: "owner.manage",
						}),
						revokeGrantRequest(key, targetGrant.aggregateId),
					]);
					expect(outcome.map((item) => item.status).sort()).toEqual([200, 409]);
					const conflict = outcome.find((item) => item.status === 409);
					expect(conflict?.body.error?.details?.code).toBe(
						"GOV_DUPLICATE_IDEMPOTENCY",
					);

					// `outcome[0]` e' o POST de emissao; `outcome[1]` e' o DELETE.
					const issue = outcome[0]!;
					const revoke = outcome[1]!;
					const row = await grantRow(pool, targetGrant.aggregateId);
					if (revoke.status === 200) {
						// Revogacao venceu: o alvo tem de estar revogado de fato, e a
						// resposta aponta o agregado revogado — nao outro.
						expect(revoke.body.aggregateId).toBe(targetGrant.aggregateId);
						expect(row?.status).toBe("revoked");
						expect(issue.status).toBe(409);
					} else {
						// Emissao venceu: o DELETE nao pode ter revogado nada nem
						// devolvido o agregado do grant recem-emitido.
						expect(revoke.status).toBe(409);
						expect(issue.status).toBe(200);
						expect(row?.status).toBe("active");
						expect(revoke.body.aggregateId).toBeUndefined();
					}
					expect(await countJournalEntries(pool, key)).toBe(1);
				},
			);
		},
	);
});
