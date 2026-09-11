import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	OWNER_AUTHORITY_CAPABILITIES,
	PLATFORM_CONSOLE_CAPABILITY,
} from "@anxionos/contracts/governance";
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
import { createAgencyScope } from "../../../apps/api/src/identity/agency-scope";
import { createIdentityApiRuntime } from "../../../apps/api/src/identity/bootstrap";
import { createIdentityPlugin } from "../../../apps/api/src/identity/plugin";
import {
	assertPgIntegrationEnvForCi,
	getDatabaseUrl,
	getPgIntegrationTestSkipReason,
} from "../test-support";

/**
 * ANX-466 — prova ponta-a-ponta com PostgreSQL real e boundary Elysia real
 * (`app.handle`), no espirito do harness que reproduziu o achado no G4:
 *
 *   operator da agencia A autoconcede `identity.admin` (era 200) e, com o
 *   grant, revoga globalmente o owner da propria agencia.
 *
 * O teste afirma o comportamento CORRIGIDO (recusa + zero escrita). Rodado
 * antes da correcao, ele falha exatamente no primeiro `expect` (200 do
 * exploit) — e' essa a prova negativa registrada no handoff.
 */

assertPgIntegrationEnvForCi();
const skipReason = getPgIntegrationTestSkipReason();

const AGENCY_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER_AUTH_USER_ID = "anx-466-owner-auth";
const OPERATOR_AUTH_USER_ID = "anx-466-operator-auth";
const OUTSIDER_AUTH_USER_ID = "anx-466-outsider-auth";

const TRUNCATE_SQL =
	"TRUNCATE governance_authority_epochs, governance_command_journal, governance_grants, governance_change_proposals, governance_approvals, governance_delegations, governance_mandates, governance_autonomy_assignments, organizations_memberships, organizations_agencies, organizations_owners, identity_sessions, identity_service_credentials, identity_service_identities, identity_principals, domain_journal, outbox RESTART IDENTITY CASCADE";

interface Fixture {
	ownerPrincipalId: string;
	operatorPrincipalId: string;
	/** Principal global sem membership na agencia: alvo das tentativas de injecao. */
	outsiderPrincipalId: string;
}

interface Harness {
	pool: Pool;
	scopedPool: TenantScopedQueryable;
	govRuntime: GovernanceApiRuntime;
	app: Elysia;
}

/**
 * Emite a baseline CAP-B01 do owner como o consumer de membership faria. O
 * fixture cria as memberships por repositorio (sem evento), entao a baseline
 * precisa ser semeada explicitamente para os testes de fluxo legitimo.
 */
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
				// Baseline CAP-B01 derivada pelo sistema (ANX-469): sem emissor.
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
) {
	const identityDb = createIdentityDb(pool);
	const owner = await identityDb.repository.createIfAbsent({
		authUserId: OWNER_AUTH_USER_ID,
		email: "anx-466-owner@example.test",
	});
	const operator = await identityDb.repository.createIfAbsent({
		authUserId: OPERATOR_AUTH_USER_ID,
		email: "anx-466-operator@example.test",
	});
	const outsider = await identityDb.repository.createIfAbsent({
		authUserId: OUTSIDER_AUTH_USER_ID,
		email: "anx-466-outsider@example.test",
	});
	if (!owner || !operator || !outsider) {
		throw new Error("ANX-466 fixture: principals were not created");
	}
	const now = new Date();
	await scopedPool.withContext(
		buildAgencyTenantContext(AGENCY_ID, owner.id),
		async (client) => {
			const orgDb = createOrganizationsDb(client);
			await orgDb.agencyRepository.save({
				id: AGENCY_ID,
				ownerPrincipalId: owner.id,
				displayName: "ANX-466 fixture agency",
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
	return {
		ownerPrincipalId: owner.id,
		operatorPrincipalId: operator.id,
		outsiderPrincipalId: outsider.id,
	} satisfies Fixture;
}

function buildHarness(pool: Pool, databaseUrl: string): Harness {
	const orgDb = createOrganizationsDb(pool);
	const govRuntime = createGovernanceApiRuntime(pool);
	const identityRuntime = createIdentityApiRuntime(pool);
	const scopedPool = createScopedPool({
		connectionString: databaseUrl,
		max: 4,
	});
	// Stub de sessao: o boundary REAL resolve o principal ativo no PostgreSQL a
	// partir do `authUserId` devolvido aqui; so' a sessao Better Auth e' trocada.
	const auth = {
		api: {
			async getSession({ headers }: { headers: Headers }) {
				const userId = headers.get("x-anx-466-auth-user");
				return userId ? { user: { id: userId } } : null;
			},
		},
	} as never;
	const app = new Elysia()
		.use(
			createGovernancePlugin({
				auth,
				...govRuntime,
				membershipRepository: orgDb.membershipRepository,
				scopedPool,
			}) as never,
		)
		.use(
			createIdentityPlugin({
				auth,
				...identityRuntime,
				grantRepository: govRuntime.grantRepository,
				agencyScope: createAgencyScope(orgDb.membershipRepository),
			}) as never,
		) as unknown as Elysia;
	return { pool, scopedPool, govRuntime, app };
}

function request(
	path: string,
	init: {
		method?: string;
		authUserId?: string;
		agencyId?: string;
		idempotencyKey?: string;
		body?: unknown;
		rawBody?: string;
	} = {},
): Request {
	const headers = new Headers();
	if (init.authUserId) {
		headers.set("x-anx-466-auth-user", init.authUserId);
	}
	if (init.agencyId) {
		headers.set("x-agency-id", init.agencyId);
	}
	if (init.idempotencyKey) {
		headers.set("idempotency-key", init.idempotencyKey);
	}
	if (init.body !== undefined || init.rawBody !== undefined) {
		headers.set("content-type", "application/json");
	}
	const body =
		init.rawBody !== undefined
			? init.rawBody
			: init.body === undefined
				? undefined
				: JSON.stringify(init.body);
	return new Request(`http://127.0.0.1${path}`, {
		method: init.method ?? "GET",
		headers,
		body,
	});
}

async function countGrantsFor(
	pool: Pool,
	principalId: string,
): Promise<number> {
	const result = await pool.query<{ count: string }>(
		"SELECT COUNT(*)::text AS count FROM governance_grants WHERE grantee_principal_id = $1",
		[principalId],
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

describe("ANX-466 — emissao de grant nao injeta capability (PostgreSQL real + app.handle)", () => {
	test.skipIf(Boolean(skipReason))(
		"operator nao autoconcede identity.admin e nao revoga o owner",
		async () => {
			await withHarness(
				async ({ app, pool, operatorPrincipalId, ownerPrincipalId }) => {
					const selfGrant = await app.handle(
						request(`/v1/agencies/${AGENCY_ID}/grants`, {
							method: "POST",
							authUserId: OPERATOR_AUTH_USER_ID,
							idempotencyKey: randomUUID(),
							body: {
								granteePrincipalId: operatorPrincipalId,
								capability: "identity.admin",
							},
						}),
					);
					const selfGrantStatus = selfGrant.status;
					const grantBody = await selfGrant.json();

					const revoke = await app.handle(
						request(`/v1/identity/principals/${ownerPrincipalId}/revoke`, {
							method: "POST",
							authUserId: OPERATOR_AUTH_USER_ID,
							agencyId: AGENCY_ID,
							idempotencyKey: randomUUID(),
							body: { reasonCode: "ops.manual" },
						}),
					);
					const revokeStatus = revoke.status;
					const revokeBody = await revoke.json();

					expect(selfGrantStatus).toBe(403);
					expect(grantBody.error.details.code).toBe(
						"GOV_INSUFFICIENT_AUTHORITY",
					);
					expect(await countGrantsFor(pool, operatorPrincipalId)).toBe(0);
					expect(revokeStatus).toBe(403);
					expect(revokeBody.error.details.code).toBe("IDN_FORBIDDEN");

					const owner = await pool.query<{ status: string }>(
						"SELECT status::text AS status FROM identity_principals WHERE id = $1",
						[ownerPrincipalId],
					);
					expect(owner.rows[0]?.status).toBe("active");
				},
			);
		},
	);

	test.skipIf(Boolean(skipReason))(
		"owner nao repassa identity.admin que nao detem (sem lavagem de autoridade)",
		async () => {
			await withHarness(async ({ app, pool, operatorPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OWNER_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: operatorPrincipalId,
							capability: "identity.admin",
						},
					}),
				);
				expect(response.status).toBe(403);
				expect((await response.json()).error.details.code).toBe(
					"GOV_INSUFFICIENT_AUTHORITY",
				);
				expect(await countGrantsFor(pool, operatorPrincipalId)).toBe(0);
			});
		},
	);

	/**
	 * ANX-462 nao regride: `console.platform` com escopo de agencia continua
	 * recusado pelo comando com `GOV_CAPABILITY_SCOPE_MISMATCH` (409) e zero
	 * escrita — a politica de papel nao troca o codigo desse caminho legado.
	 */
	test.skipIf(Boolean(skipReason))(
		"console.platform agency-scoped continua 409 e sem escrita (ANX-462)",
		async () => {
			await withHarness(async ({ app, pool, operatorPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OPERATOR_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: operatorPrincipalId,
							capability: PLATFORM_CONSOLE_CAPABILITY,
						},
					}),
				);
				expect(response.status).toBe(409);
				expect((await response.json()).error.details.code).toBe(
					"GOV_CAPABILITY_SCOPE_MISMATCH",
				);
				expect(await countGrantsFor(pool, operatorPrincipalId)).toBe(0);
			});
		},
	);

	test.skipIf(Boolean(skipReason))(
		"capability desconhecida e' 400 institucional e nao escreve",
		async () => {
			await withHarness(async ({ app, pool, operatorPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OWNER_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: operatorPrincipalId,
							capability: "totally.unknown.capability",
						},
					}),
				);
				expect(response.status).toBe(400);
				expect((await response.json()).error.details.code).toBe(
					"GOV_CAPABILITY_UNKNOWN",
				);
				expect(await countGrantsFor(pool, operatorPrincipalId)).toBe(0);
			});
		},
	);

	/**
	 * G5 FURO 1 (HIGH): `owner.read` confere autoridade de owner
	 * (`hasOwnerAuthority`); um `operator` a emitia a terceiro sem vinculo e o
	 * terceiro passava a aprovar proposta INSTITUTIONAL/HIERARCHY_MODE.
	 */
	test.skipIf(Boolean(skipReason))(
		"operator nao forja owner.read para terceiro (autoridade de owner)",
		async () => {
			await withHarness(async ({ app, pool, outsiderPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OPERATOR_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: outsiderPrincipalId,
							capability: "owner.read",
						},
					}),
				);
				expect(response.status).toBe(403);
				expect((await response.json()).error.details.code).toBe(
					"GOV_INSUFFICIENT_AUTHORITY",
				);
				expect(await countGrantsFor(pool, outsiderPrincipalId)).toBe(0);
			});
		},
	);

	/**
	 * G5 FURO 2: capability operacional de outro modulo tambem e' autoridade
	 * efetiva (`governance-guards`); o emissor nao pode conceder a terceiro o que
	 * nao detem.
	 */
	test.skipIf(Boolean(skipReason))(
		"operator nao concede agents.skills.evaluate a terceiro sem posse",
		async () => {
			await withHarness(async ({ app, pool, outsiderPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OPERATOR_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: outsiderPrincipalId,
							capability: "agents.skills.evaluate",
						},
					}),
				);
				expect(response.status).toBe(403);
				expect((await response.json()).error.details.code).toBe(
					"GOV_INSUFFICIENT_AUTHORITY",
				);
				expect(await countGrantsFor(pool, outsiderPrincipalId)).toBe(0);
			});
		},
	);

	/** G5 FURO 4: existencia antes de autoridade, mesmo com prefixo administrativo. */
	test.skipIf(Boolean(skipReason))(
		"capability desconhecida com prefixo administrativo e' 400, nao 403",
		async () => {
			await withHarness(async ({ app, pool, outsiderPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OPERATOR_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: outsiderPrincipalId,
							capability: "identity.superadmin",
						},
					}),
				);
				expect(response.status).toBe(400);
				expect((await response.json()).error.details.code).toBe(
					"GOV_CAPABILITY_UNKNOWN",
				);
			});
		},
	);

	/** G5 FURO 3: JSON malformado com Idempotency-Key valida tambem e' 400. */
	test.skipIf(Boolean(skipReason))(
		"body JSON malformado e' 400, nao 500",
		async () => {
			await withHarness(async ({ app, pool, outsiderPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OPERATOR_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						rawBody: '{"granteePrincipalId": ',
					}),
				);
				expect(response.status).toBe(400);
				expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
				expect(await countGrantsFor(pool, outsiderPrincipalId)).toBe(0);
			});
		},
	);

	/** Fluxo legitimo preservado: owner detem a baseline e repassa `owner.manage`. */
	test.skipIf(Boolean(skipReason))(
		"owner detentor repassa owner.manage (fluxo legitimo preservado)",
		async () => {
			await withHarness(async ({ app, pool, operatorPrincipalId }) => {
				const response = await app.handle(
					request(`/v1/agencies/${AGENCY_ID}/grants`, {
						method: "POST",
						authUserId: OWNER_AUTH_USER_ID,
						idempotencyKey: randomUUID(),
						body: {
							granteePrincipalId: operatorPrincipalId,
							capability: "owner.manage",
						},
					}),
				);
				expect(response.status).toBe(200);
				expect(await countGrantsFor(pool, operatorPrincipalId)).toBe(1);
			});
		},
	);
});
