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
import type { Pool } from "pg";
import {
	createGovernanceApiRuntime,
	type GovernanceApiRuntime,
} from "../../../apps/api/src/governance/bootstrap";
import { createGovernancePlugin } from "../../../apps/api/src/governance/plugin";
import { truncateDomainTables } from "../../pg-harness-guard";
import {
	assertPgIntegrationEnvForCi,
	getDatabaseUrl,
	getPgIntegrationTestSkipReason,
} from "../test-support";

/**
 * ANX-469 — prova ponta-a-ponta com PostgreSQL real e boundary Elysia real
 * (`app.handle`) de que a revogacao de grant deixou de ser apenas uma guarda de
 * papel.
 *
 * A rota `DELETE /v1/agencies/:agencyId/grants/:grantId` reusava
 * `requireAgencyMutationRole` (`owner|admin|operator`) e **nao limitava o
 * alvo**: um `operator` revogava grants do `owner` da propria agencia. O
 * catalogo declara `governance.grant.revoke` como owner ou issuer.
 *
 * Rodado ANTES da correcao, o primeiro teste falha exatamente no `expect(403)`
 * (a resposta e' 200 e o grant do owner vira `revoked`) — e' a prova negativa
 * registrada no handoff.
 */

assertPgIntegrationEnvForCi();
const skipReason = getPgIntegrationTestSkipReason();

const AGENCY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const OWNER_AUTH_USER_ID = "anx-469-owner-auth";
const OPERATOR_AUTH_USER_ID = "anx-469-operator-auth";
const OUTSIDER_AUTH_USER_ID = "anx-469-outsider-auth";

const TRUNCATE_SQL =
	"TRUNCATE governance_authority_epochs, governance_command_journal, governance_grants, governance_change_proposals, governance_approvals, governance_delegations, governance_mandates, governance_autonomy_assignments, organizations_memberships, organizations_agencies, organizations_owners, identity_sessions, identity_service_credentials, identity_service_identities, identity_principals, domain_journal, outbox RESTART IDENTITY CASCADE";

interface Fixture {
	ownerPrincipalId: string;
	operatorPrincipalId: string;
	outsiderPrincipalId: string;
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

/**
 * Emite um grant diretamente pelo comando, com emissor declarado. Serve para
 * (a) dar ao operator uma capability operacional que ele possa repassar por
 * HTTP e (b) semear o estado legado de um grant administrativo emitido por um
 * `operator` (possivel antes do ANX-466), que a revogacao nao pode liberar.
 */
async function seedGrant(
	govRuntime: GovernanceApiRuntime,
	input: {
		granteePrincipalId: string;
		capability: string;
		issuedByPrincipalId: string | null;
	},
): Promise<string> {
	const result = await issueGrant(
		{
			unitOfWork: govRuntime.unitOfWork,
			commandJournal: govRuntime.commandJournal,
			principalLookup: govRuntime.principalLookup,
		},
		{
			commandId: randomUUID(),
			scopeId: AGENCY_ID,
			granteePrincipalId: input.granteePrincipalId,
			issuedByPrincipalId: input.issuedByPrincipalId,
			capability: input.capability,
		},
	);
	return result.aggregateId;
}

async function seedFixture(
	pool: Pool,
	scopedPool: TenantScopedQueryable,
	govRuntime: GovernanceApiRuntime,
): Promise<Fixture> {
	const identityDb = createIdentityDb(pool);
	const owner = await identityDb.repository.createIfAbsent({
		authUserId: OWNER_AUTH_USER_ID,
		email: "anx-469-owner@example.test",
	});
	const operator = await identityDb.repository.createIfAbsent({
		authUserId: OPERATOR_AUTH_USER_ID,
		email: "anx-469-operator@example.test",
	});
	const outsider = await identityDb.repository.createIfAbsent({
		authUserId: OUTSIDER_AUTH_USER_ID,
		email: "anx-469-outsider@example.test",
	});
	if (!owner || !operator || !outsider) {
		throw new Error("ANX-469 fixture: principals were not created");
	}
	const now = new Date();
	await scopedPool.withContext(
		buildAgencyTenantContext(AGENCY_ID, owner.id),
		async (client) => {
			const orgDb = createOrganizationsDb(client);
			await orgDb.agencyRepository.save({
				id: AGENCY_ID,
				ownerPrincipalId: owner.id,
				displayName: "ANX-469 fixture agency",
				marketScope: "both",
				status: "draft",
				onboardingStep: "created",
				revision: 1,
				createdAt: now,
				updatedAt: now,
			});
			for (const [principalId, role] of [
				[owner.id, "owner"],
				[operator.id, "operator"],
			] as const) {
				await orgDb.membershipRepository.save({
					id: randomUUID(),
					agencyId: AGENCY_ID,
					principalId,
					inviteEmail: null,
					inviteTokenHash: null,
					inviteExpiresAt: null,
					role,
					status: "active",
					invitedAt: null,
					joinedAt: now,
					revokedAt: null,
					revision: 1,
					createdAt: now,
					updatedAt: now,
				});
			}
		},
	);
	await seedOwnerBaseline(govRuntime, owner.id);
	// O operator precisa DETER a capability operacional para poder repassa-la
	// pela rota (ANX-466: ninguem concede o que nao detem).
	await seedGrant(govRuntime, {
		granteePrincipalId: operator.id,
		capability: "agents.publish",
		issuedByPrincipalId: null,
	});
	return {
		ownerPrincipalId: owner.id,
		operatorPrincipalId: operator.id,
		outsiderPrincipalId: outsider.id,
	};
}

function buildHarness(pool: Pool, databaseUrl: string): Harness {
	const orgDb = createOrganizationsDb(pool);
	const govRuntime = createGovernanceApiRuntime(pool);
	const scopedPool = createScopedPool({
		connectionString: databaseUrl,
		max: 4,
	});
	const auth = {
		api: {
			async getSession({ headers }: { headers: Headers }) {
				const userId = headers.get("x-anx-469-auth-user");
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

function request(
	path: string,
	init: {
		method?: string;
		authUserId?: string;
		idempotencyKey?: string;
		body?: unknown;
	} = {},
): Request {
	const headers = new Headers();
	if (init.authUserId) {
		headers.set("x-anx-469-auth-user", init.authUserId);
	}
	if (init.idempotencyKey) {
		headers.set("idempotency-key", init.idempotencyKey);
	}
	if (init.body !== undefined) {
		headers.set("content-type", "application/json");
	}
	return new Request(`http://127.0.0.1${path}`, {
		method: init.method ?? "GET",
		headers,
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
	});
}

async function grantStatus(pool: Pool, grantId: string): Promise<string> {
	const result = await pool.query<{ status: string }>(
		"SELECT status::text AS status FROM governance_grants WHERE id = $1",
		[grantId],
	);
	return result.rows[0]?.status ?? "missing";
}

async function activeGrantId(
	pool: Pool,
	principalId: string,
	capability: string,
): Promise<string> {
	const result = await pool.query<{ id: string }>(
		"SELECT id FROM governance_grants WHERE grantee_principal_id = $1 AND capability = $2 AND status = 'active' LIMIT 1",
		[principalId, capability],
	);
	const id = result.rows[0]?.id;
	if (!id) {
		throw new Error(
			`ANX-469 fixture: no active ${capability} grant for ${principalId}`,
		);
	}
	return id;
}

async function withHarness(
	work: (ctx: Harness & Fixture) => Promise<void>,
): Promise<void> {
	const url = getDatabaseUrl();
	if (skipReason || !url) {
		return;
	}
	const pool = createPgPool(url);
	const harness = buildHarness(pool, url);
	try {
		await ensureIdentitySchema(pool);
		await ensureOrganizationsSchema(pool);
		await ensureGovernanceSchema(pool);
		await truncateDomainTables(pool, TRUNCATE_SQL);
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

describe("ANX-469 — revogacao de grant limita o alvo (PostgreSQL real + app.handle)", () => {
	test.skipIf(Boolean(skipReason))(
		"operator nao revoga grant do owner e o grant permanece ativo",
		async () => {
			await withHarness(async ({ app, pool, ownerPrincipalId }) => {
				const ownerGrantId = await activeGrantId(
					pool,
					ownerPrincipalId,
					"owner.manage",
				);
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants/${ownerGrantId}`, {
						method: "DELETE",
						authUserId: OPERATOR_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {},
					}),
				);
				const status = response.status;
				const body = await response.json();
				const dbStatus = await grantStatus(pool, ownerGrantId);

				// Uma unica assercao carrega os dois fatos da prova negativa: a
				// resposta HTTP e o estado do grant no banco. Antes da correcao o
				// diff mostra `status: 200, dbStatus: "revoked"`.
				expect({ status, dbStatus }).toEqual({
					status: 403,
					dbStatus: "active",
				});
				expect(body.error.details.code).toBe("GOV_INSUFFICIENT_AUTHORITY");
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"emissor operator revoga o proprio grant operacional",
		async () => {
			await withHarness(
				async ({ app, pool, operatorPrincipalId, outsiderPrincipalId }) => {
					const issue = await app.handle(
						request(`/v1/agencies/${AGENCY_ID}/grants`, {
							method: "POST",
							authUserId: OPERATOR_AUTH_USER_ID,
							idempotencyKey: randomUUID(),
							body: {
								granteePrincipalId: outsiderPrincipalId,
								capability: "agents.publish",
							},
						}),
					);
					expect(issue.status).toBe(200);
					const issuedGrantId = await activeGrantId(
						pool,
						outsiderPrincipalId,
						"agents.publish",
					);
					const issuer = await pool.query<{ issued_by: string | null }>(
						"SELECT issued_by_principal_id::text AS issued_by FROM governance_grants WHERE id = $1",
						[issuedGrantId],
					);
					expect(issuer.rows[0]?.issued_by).toBe(operatorPrincipalId);

					const response = await app.handle(
						request(`/v1/agencies/${AGENCY_ID}/grants/${issuedGrantId}`, {
							method: "DELETE",
							authUserId: OPERATOR_AUTH_USER_ID,
							idempotencyKey: randomUUID(),
							body: {},
						}),
					);
					expect(response.status).toBe(200);
					expect(await grantStatus(pool, issuedGrantId)).toBe("revoked");
				},
			);
		},
	);

	test.skipIf(Boolean(skipReason))(
		"owner revoga grant de terceiro na agencia",
		async () => {
			await withHarness(
				async ({ app, pool, govRuntime, outsiderPrincipalId }) => {
					const thirdPartyGrantId = await seedGrant(govRuntime, {
						granteePrincipalId: outsiderPrincipalId,
						capability: "agents.publish",
						issuedByPrincipalId: null,
					});
					const response = await app.handle(
						request(`/v1/agencies/${AGENCY_ID}/grants/${thirdPartyGrantId}`, {
							method: "DELETE",
							authUserId: OWNER_AUTH_USER_ID,
							idempotencyKey: randomUUID(),
							body: {},
						}),
					);
					expect(response.status).toBe(200);
					expect(await grantStatus(pool, thirdPartyGrantId)).toBe("revoked");
				},
			);
		},
	);

	/**
	 * O caminho de emissor nao amplia a classe: mesmo registrado como emissor,
	 * um `operator` nao revoga grant administrativo (estado legado possivel antes
	 * do ANX-466).
	 */
	test.skipIf(Boolean(skipReason))(
		"operator emissor nao revoga grant administrativo (classe superior)",
		async () => {
			await withHarness(
				async ({
					app,
					pool,
					govRuntime,
					operatorPrincipalId,
					outsiderPrincipalId,
				}) => {
					const adminGrantId = await seedGrant(govRuntime, {
						granteePrincipalId: outsiderPrincipalId,
						capability: "identity.admin",
						issuedByPrincipalId: operatorPrincipalId,
					});
					const response = await app.handle(
						request(`/v1/agencies/${AGENCY_ID}/grants/${adminGrantId}`, {
							method: "DELETE",
							authUserId: OPERATOR_AUTH_USER_ID,
							idempotencyKey: randomUUID(),
							body: {},
						}),
					);
					expect(response.status).toBe(403);
					expect((await response.json()).error.details.code).toBe(
						"GOV_INSUFFICIENT_AUTHORITY",
					);
					expect(await grantStatus(pool, adminGrantId)).toBe("active");
				},
			);
		},
	);
});
