import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createScopedPool } from "@anxionos/database";
import { createPgPool } from "@anxionos/eventing/postgres";
import { ensureGovernanceSchema, issueGrant } from "@anxionos/governance";
import { createIdentityDb, ensureIdentitySchema } from "@anxionos/identity";
import {
	buildAgencyTenantContext,
	createOrganizationsDb,
	ensureOrganizationsSchema,
} from "@anxionos/organizations";
import type { Pool } from "pg";
import { createGovernanceApiRuntime } from "../../../apps/api/src/governance/bootstrap";
import { truncateDomainTables } from "../../pg-harness-guard";
import {
	assertPgIntegrationEnvForCi,
	getDatabaseUrl,
	getPgIntegrationTestSkipReason,
} from "../test-support";

/**
 * ANX-477 (rodada 2) — oraculo de esgotamento de pool com `pool.max` DEFAULT.
 *
 * O escopo item 3 da issue exige provar "N comandos concorrentes com `pool.max`
 * default respondendo sem timeout". O oraculo de concorrencia da ANX-457 so'
 * passa porque ELEVA `pool.options.max` para 30, o que mascara exatamente o
 * risco de producao. Este arquivo NAO toca naquele oraculo (decisao de outro
 * slice): cria o pool pelo caminho padrao (`createPgPool`, que nao passa `max`)
 * e dispara N = `pool.max` default de `issueGrant` simultaneos.
 *
 * Com o defeito (leitura de identidade pelo pool compartilhado com a transacao
 * aberta), cada um dos 10 comandos segura 1 das 10 conexoes e espera uma 11a
 * que so' seria liberada quando ele mesmo terminasse: o burst nao responde. Com
 * a correcao (leitura em `context.client`), nenhuma conexao extra e' pedida e
 * os 10 concluem.
 *
 * Falsificacao registrada no handoff: devolvendo a leitura ao pool
 * compartilhado (adapter ignorando `options.transactionClient`), o burst
 * estoura o deadline abaixo; restaurado byte a byte, verde.
 */

assertPgIntegrationEnvForCi();
const skipReason = getPgIntegrationTestSkipReason();

const AGENCY_ID = "47747747-4774-4774-8774-477747774777";
const CAPABILITY = "owner.manage";

/**
 * Fonte do limite: o default do driver `pg`/`pg-pool` e' `max: 10`
 * (packages/eventing/src/postgres.ts `createPgPool` nao passa `max`). N = 10
 * reproduz a rajada "N ~ pool.max" da issue.
 */
const PG_DEFAULT_POOL_MAX = 10;
const BURST_CONCURRENCY = PG_DEFAULT_POOL_MAX;

/**
 * Limite de resposta do oraculo. Fonte: medicao do G5 (ANX-477) — com a ordem
 * antiga o burst ficou pendurado e estourou o deadline de 5s; com a correcao
 * respondeu em ~150 ms. 5s e' ~30x a latencia corrigida, folga suficiente para
 * CI sob carga, e o caminho defeituoso NAO se resolve sozinho (o driver `pg` usa
 * `connectionTimeoutMillis = 0`, espera indefinida), logo o deadline e' o que
 * transforma "preso" em falha explicita.
 */
const BURST_RESPONSE_DEADLINE_MS = 5_000;

/**
 * Rede de seguranca de CLEANUP (nao e' o limite do oraculo, que e' o deadline
 * acima): `pool.end()` espera as conexoes em uso serem liberadas. Sem um teto
 * de checkout, um burst defeituoso deixaria o processo preso para sempre. Maior
 * que o deadline (5s) para que a falha observada seja a do oraculo, e menor que
 * o timeout do teste (15s) para o cleanup terminar antes dele. O `pg` le
 * `options.connectionTimeoutMillis` a cada checkout.
 */
const POOL_CHECKOUT_SAFETY_MS = 8_000;

/** O timeout do teste precisa ser MAIOR que o deadline, para a mensagem do oraculo aparecer. */
const BURST_TEST_TIMEOUT_MS = BURST_RESPONSE_DEADLINE_MS + 10_000;

const TRUNCATE_SQL =
	"TRUNCATE governance_authority_epochs, governance_command_journal, governance_grants, governance_change_proposals, governance_approvals, governance_delegations, governance_mandates, governance_autonomy_assignments, organizations_memberships, organizations_agencies, organizations_owners, identity_sessions, identity_service_credentials, identity_service_identities, identity_principals, domain_journal, outbox RESTART IDENTITY CASCADE";

interface Fixture {
	ownerPrincipalId: string;
	targetPrincipalId: string;
}

interface Harness {
	pool: Pool;
	govRuntime: ReturnType<typeof createGovernanceApiRuntime>;
}

function withDeadline<T>(
	work: Promise<T>,
	timeoutMs: number,
	message: string,
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => reject(new Error(message)), timeoutMs);
	});
	return Promise.race([work, deadline]).finally(() => {
		if (timer !== undefined) {
			clearTimeout(timer);
		}
	});
}

async function seed(
	pool: Pool,
	databaseUrl: string,
	govRuntime: ReturnType<typeof createGovernanceApiRuntime>,
): Promise<Fixture> {
	const identityDb = createIdentityDb(pool);
	const owner = await identityDb.repository.createIfAbsent({
		authUserId: "anx-477-pool-owner",
		email: "anx-477-pool-owner@example.test",
	});
	const target = await identityDb.repository.createIfAbsent({
		authUserId: "anx-477-pool-target",
		email: "anx-477-pool-target@example.test",
	});
	if (!owner || !target) {
		throw new Error(
			"ANX-477 pool-saturation fixture: principals were not created",
		);
	}
	const scopedPool = createScopedPool({
		connectionString: databaseUrl,
		max: 4,
	});
	try {
		const now = new Date();
		await scopedPool.withContext(
			buildAgencyTenantContext(AGENCY_ID, owner.id),
			async (client) => {
				const orgDb = createOrganizationsDb(client);
				await orgDb.agencyRepository.save({
					id: AGENCY_ID,
					ownerPrincipalId: owner.id,
					displayName: "ANX-477 pool-saturation fixture",
					marketScope: "both",
					status: "draft",
					onboardingStep: "created",
					revision: 1,
					createdAt: now,
					updatedAt: now,
				});
			},
		);
	} finally {
		await scopedPool.end();
	}
	// Um grant real do owner (fora do burst) garante a linha de epoch do escopo.
	await issueGrant(
		{
			unitOfWork: govRuntime.unitOfWork,
			commandJournal: govRuntime.commandJournal,
			principalLookup: govRuntime.principalLookup,
		},
		{
			commandId: randomUUID(),
			scopeId: AGENCY_ID,
			issuedByPrincipalId: null,
			granteePrincipalId: owner.id,
			capability: "owner.read",
		},
	);
	return { ownerPrincipalId: owner.id, targetPrincipalId: target.id };
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

async function withHarness(
	work: (ctx: Harness & Fixture) => Promise<void>,
): Promise<void> {
	const url = getDatabaseUrl();
	if (skipReason || !url) {
		return;
	}
	const pool = createPgPool(url);
	// NAO inflar o pool: `createPgPool` nao passa `max`, entao vale o default do
	// driver. So' o teto de checkout e' ajustado, como rede de cleanup.
	pool.options.connectionTimeoutMillis = POOL_CHECKOUT_SAFETY_MS;
	const govRuntime = createGovernanceApiRuntime(pool);
	try {
		await ensureIdentitySchema(pool);
		await ensureOrganizationsSchema(pool);
		await ensureGovernanceSchema(pool);
		await truncateDomainTables(pool, TRUNCATE_SQL);
		const fixture = await seed(pool, url, govRuntime);
		await work({ pool, govRuntime, ...fixture });
	} finally {
		await pool.end();
	}
}

describe("ANX-477 — burst de issueGrant com pool.max DEFAULT (PostgreSQL real)", () => {
	test(
		`${BURST_CONCURRENCY} issueGrant simultaneos com max default (${PG_DEFAULT_POOL_MAX}): todos respondem sem timeout`,
		async () => {
			await withHarness(async ({ pool, govRuntime, targetPrincipalId }) => {
				// Prova de que o pool NAO foi inflado: `pg-pool` aplica
				// `max: 10` no proprio construtor quando `createPgPool` nao o
				// informa, entao o valor efetivo e' o default do driver.
				expect(pool.options.max).toBe(PG_DEFAULT_POOL_MAX);
				const results = await withDeadline(
					Promise.all(
						Array.from({ length: BURST_CONCURRENCY }, () =>
							issueGrant(
								{
									unitOfWork: govRuntime.unitOfWork,
									commandJournal: govRuntime.commandJournal,
									principalLookup: govRuntime.principalLookup,
								},
								{
									commandId: randomUUID(),
									scopeId: AGENCY_ID,
									issuedByPrincipalId: null,
									granteePrincipalId: targetPrincipalId,
									capability: CAPABILITY,
								},
							),
						),
					),
					BURST_RESPONSE_DEADLINE_MS,
					`POOL STARVATION: ${BURST_CONCURRENCY} issueGrant simultaneos nao responderam em ${BURST_RESPONSE_DEADLINE_MS}ms com pool.max default ${PG_DEFAULT_POOL_MAX}`,
				);
				expect(results).toHaveLength(BURST_CONCURRENCY);
				for (const result of results) {
					expect(result.aggregateId).toBeTruthy();
				}
				expect(
					await countActiveGrants(pool, targetPrincipalId, CAPABILITY),
				).toBe(BURST_CONCURRENCY);
			});
		},
		BURST_TEST_TIMEOUT_MS,
	);
});
