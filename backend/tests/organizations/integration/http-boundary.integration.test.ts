import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createScopedPool,
	type TenantScopedQueryable,
} from "@anxionos/database";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createIdentityDb,
	ensureIdentitySchema,
	registerPrincipal,
} from "@anxionos/identity";
import {
	createHmacInviteTokenHasher,
	createIdentityPrincipalLookup,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
	ensureOrganizationsSchema,
} from "@anxionos/organizations";
import { Elysia } from "elysia";
import type { Pool } from "pg";
import { createOrganizationsPlugin } from "../../../apps/api/src/organizations/plugin";
import { getDatabaseUrl, shouldRunPgIntegrationTests } from "../test-support";

/**
 * Boundary HTTP REAL (Elysia `app.handle`) das rotas de `organizations`, com
 * PostgreSQL real. Fecha a lacuna que os tres gates da ANX-460 apontaram: nao
 * existia teste de ROTA — o handler era chamado direto, entao o mapeamento de
 * erro do boundary, a autenticacao e a opacidade das respostas nunca eram
 * exercitados (o G3 so' descobriu o 500 de body invalido por sonda manual).
 *
 * Cobre:
 *  - 401 sem sessao;
 *  - 400 (nao 500) para body malformado / campo extra / body vazio — G3;
 *  - opacidade: nao-owner recebe a MESMA resposta para sucessor existente e
 *    inexistente — G5-F1/G4-F1;
 *  - opacidade: ativacao de convite nunca vincula sem consentimento e responde
 *    IGUAL exista ou nao principal para o e-mail — G5-F2;
 *  - caminho legitimo de transferencia de posse com evento no outbox.
 */
const PEPPER = "organizations-http-boundary-pepper";

const TRUNCATE_SQL = `TRUNCATE organizations_command_journal, organizations_memberships,
	organizations_owners, organizations_agencies, domain_journal, outbox,
	identity_sessions, identity_service_credentials, identity_service_identities,
	identity_principals, identity_command_journal RESTART IDENTITY CASCADE`;

interface Harness {
	app: Elysia;
	pool: Pool;
	scopedPool: TenantScopedQueryable;
	/** Cria um principal e devolve o header de sessao correspondente. */
	createSession: (email: string) => Promise<{
		principalId: string;
		headers: Record<string, string>;
	}>;
}

async function withOrganizationsHttpHarness(
	work: (harness: Harness) => Promise<void>,
): Promise<void> {
	if (!shouldRunPgIntegrationTests()) {
		return;
	}
	const url = getDatabaseUrl();
	if (!url) return;

	// `app.handle` nao tem socket, entao o rate limit de `/invites/accept` nao
	// consegue resolver o IP sem o caminho de proxy (o mesmo de producao atras de
	// um balanceador). Sem isso o boundary devolve 503 CLIENT_IP_UNAVAILABLE.
	const previousTrustProxy = process.env.TRUST_PROXY;
	process.env.TRUST_PROXY = "true";

	const pool = createPgPool(url);
	const scopedPool = createScopedPool({ connectionString: url, max: 4 });
	try {
		await ensureEventingSchema(pool);
		await ensureIdentitySchema(pool);
		await ensureOrganizationsSchema(pool);
		await pool.query(TRUNCATE_SQL);

		const orgDb = createOrganizationsDb(pool);
		const identityDb = createIdentityDb(pool);
		// Better Auth real devolve `user.email` e o `accept-invite` compara com o
		// e-mail do convite (D-ORG-034), entao o stub precisa do e-mail tambem.
		const authEmails = new Map<string, string>();
		const app = new Elysia().use(
			createOrganizationsPlugin({
				auth: {
					api: {
						async getSession({ headers }: { headers: Headers }) {
							const authUserId = headers.get("x-test-auth");
							if (!authUserId) {
								return null;
							}
							return {
								user: {
									id: authUserId,
									email: authEmails.get(authUserId) ?? "",
								},
							};
						},
					},
				} as never,
				agencyRepository: orgDb.agencyRepository,
				membershipRepository: orgDb.membershipRepository,
				commandJournal: orgDb.commandJournal,
				unitOfWork: createOrganizationUnitOfWork(pool),
				principalLookup: createIdentityPrincipalLookup(pool),
				inviteTokenHasher: createHmacInviteTokenHasher(PEPPER),
				identityRepository: identityDb.repository,
				scopedPool,
			}) as never,
		) as unknown as Elysia;

		const createSession = async (email: string) => {
			const authUserId = `auth-${randomUUID()}`;
			authEmails.set(authUserId, email);
			const principal = await registerPrincipal(
				{
					repository: identityDb.repository,
					unitOfWork: identityDb.unitOfWork,
				},
				{ authUserId, email },
			);
			return {
				principalId: principal.id,
				headers: {
					"content-type": "application/json",
					"x-test-auth": authUserId,
					"idempotency-key": randomUUID(),
				},
			};
		};

		await work({ app, pool, scopedPool, createSession });
	} finally {
		if (previousTrustProxy === undefined) {
			delete process.env.TRUST_PROXY;
		} else {
			process.env.TRUST_PROXY = previousTrustProxy;
		}
		await scopedPool.end();
		await pool.end();
	}
}

function jsonRequest(
	path: string,
	options: {
		method?: string;
		headers?: Record<string, string>;
		rawBody?: string;
		body?: unknown;
	} = {},
): Request {
	const headers = new Headers(options.headers ?? {});
	if (options.body !== undefined) {
		headers.set("content-type", "application/json");
	}
	return new Request(`http://127.0.0.1${path}`, {
		method: options.method ?? "POST",
		headers,
		body:
			options.rawBody ??
			(options.body === undefined ? undefined : JSON.stringify(options.body)),
	});
}

/** Envelope de erro sem o `timestamp` (volatil por milissegundos). */
async function envelopeOf(response: {
	json: () => Promise<unknown>;
}): Promise<unknown> {
	const body = (await response.json()) as {
		error?: { code?: string; message?: string; details?: unknown };
	};
	return {
		code: body.error?.code,
		message: body.error?.message,
		details: body.error?.details,
	};
}

async function createAgencyFor(
	app: Elysia,
	session: { headers: Record<string, string> },
	displayName: string,
): Promise<string> {
	const response = await app.handle(
		jsonRequest("/v1/organizations/agencies", {
			headers: session.headers,
			body: { displayName, marketScope: "both" },
		}),
	);
	expect(response.status).toBe(200);
	const payload = (await response.json()) as { aggregateId: string };
	return payload.aggregateId;
}

describe("organizations boundary HTTP (PG real + app.handle)", () => {
	test("sem sessao e' 401", async () => {
		await withOrganizationsHttpHarness(async ({ app }) => {
			const response = await app.handle(
				jsonRequest("/v1/organizations/agencies", {
					headers: { "content-type": "application/json" },
					body: { displayName: "No Session", marketScope: "both" },
				}),
			);
			expect(response.status).toBe(401);
		});
	});

	test("body invalido na rota de transferencia e' 400, nunca 500 (G3)", async () => {
		await withOrganizationsHttpHarness(async ({ app, createSession }) => {
			const owner = await createSession("owner-400@example.com");
			const agencyId = await createAgencyFor(app, owner, "Agency 400");
			const base = `/v1/organizations/agencies/${agencyId}/ownership/transfer`;

			const cases: Array<{ label: string; request: Request }> = [
				{
					label: "JSON malformado",
					request: jsonRequest(base, {
						headers: owner.headers,
						rawBody: "{ this is not json",
					}),
				},
				{
					label: "body vazio",
					request: jsonRequest(base, { headers: owner.headers, body: {} }),
				},
				{
					label: "campo extra",
					request: jsonRequest(base, {
						headers: owner.headers,
						body: {
							newOwnerPrincipalId: randomUUID(),
							extra: true,
						},
					}),
				},
				{
					label: "UUID invalido",
					request: jsonRequest(base, {
						headers: owner.headers,
						body: { newOwnerPrincipalId: "not-a-uuid" },
					}),
				},
			];

			for (const testCase of cases) {
				const response = await app.handle(testCase.request);
				expect(`${testCase.label}:${response.status}`).toBe(
					`${testCase.label}:400`,
				);
			}
		});
	});

	test("admin nao-owner nao distingue sucessor existente de inexistente (sem oraculo) — G5-F1/G4-F1", async () => {
		await withOrganizationsHttpHarness(async ({ app, createSession }) => {
			const owner = await createSession("owner-oracle@example.com");
			// O ATOR precisa passar o boundary (membership ativa + papel de mutacao)
			// e falhar apenas na autorizacao de DOMINIO — so' assim o caminho chega
			// a' verificacao do sucessor. Um nao-membro e' barrado antes (o mesmo
			// 403 para qualquer alvo), o que nao exercita o oraculo.
			const admin = await createSession("admin-oracle@example.com");
			const stranger = await createSession("stranger-oracle@example.com");
			const agencyId = await createAgencyFor(app, owner, "Agency Oracle");
			const base = `/v1/organizations/agencies/${agencyId}/ownership/transfer`;

			// Torna `admin` membro ATIVO com papel admin (convite + aceite pelo
			// proprio principal = caminho consensual).
			const inviteResponse = await app.handle(
				jsonRequest(
					`/v1/organizations/agencies/${agencyId}/memberships/invite`,
					{
						headers: { ...owner.headers, "idempotency-key": randomUUID() },
						body: { email: "admin-oracle@example.com", role: "admin" },
					},
				),
			);
			expect(inviteResponse.status).toBe(200);
			const { inviteToken } = (await inviteResponse.json()) as {
				inviteToken: string;
			};
			const acceptResponse = await app.handle(
				jsonRequest("/v1/organizations/invites/accept", {
					headers: {
						...admin.headers,
						"idempotency-key": randomUUID(),
						"x-forwarded-for": "203.0.113.43",
					},
					body: { token: inviteToken },
				}),
			);
			expect(acceptResponse.status).toBe(200);

			// `stranger` existe na plataforma (principal registrado) mas nao e'
			// membro; `randomUUID()` nao existe em lugar nenhum.
			const existingTarget = await app.handle(
				jsonRequest(base, {
					headers: { ...admin.headers, "idempotency-key": randomUUID() },
					body: { newOwnerPrincipalId: stranger.principalId },
				}),
			);
			const missingTarget = await app.handle(
				jsonRequest(base, {
					headers: { ...admin.headers, "idempotency-key": randomUUID() },
					body: { newOwnerPrincipalId: randomUUID() },
				}),
			);

			expect(existingTarget.status).toBe(403);
			expect(missingTarget.status).toBe(403);
			// `timestamp` difere por milissegundos; o que importa e' que codigo,
			// mensagem e details sejam identicos.
			expect(await envelopeOf(existingTarget)).toEqual(
				await envelopeOf(missingTarget),
			);
		});
	});

	test("ativacao assistida nao vincula terceiro e nao enumera e-mail (G5-F2)", async () => {
		await withOrganizationsHttpHarness(async ({ app, createSession, pool }) => {
			const owner = await createSession("owner-consent@example.com");
			// Um e-mail que TEM principal registrado na plataforma...
			await createSession("registered-victim@example.com");
			const agencyId = await createAgencyFor(app, owner, "Agency Consent");

			const invite = async (email: string, key: string) => {
				const response = await app.handle(
					jsonRequest(
						`/v1/organizations/agencies/${agencyId}/memberships/invite`,
						{
							headers: { ...owner.headers, "idempotency-key": key },
							body: { email, role: "operator" },
						},
					),
				);
				expect(response.status).toBe(200);
				return ((await response.json()) as { aggregateId: string }).aggregateId;
			};

			const registeredMembershipId = await invite(
				"registered-victim@example.com",
				randomUUID(),
			);
			const unknownMembershipId = await invite(
				"nobody-here@example.com",
				randomUUID(),
			);

			const activate = async (membershipId: string) =>
				app.handle(
					jsonRequest(
						`/v1/organizations/agencies/${agencyId}/memberships/${membershipId}/activate`,
						{
							headers: { ...owner.headers, "idempotency-key": randomUUID() },
						},
					),
				);

			const forRegistered = await activate(registeredMembershipId);
			const forUnknown = await activate(unknownMembershipId);

			// Mesma resposta nos dois casos: nao ha' como inferir se o e-mail esta'
			// registrado, e nenhum vinculo e' criado sem consentimento.
			expect(forRegistered.status).toBe(403);
			expect(forUnknown.status).toBe(403);
			expect(await envelopeOf(forRegistered)).toEqual(
				await envelopeOf(forUnknown),
			);

			// A UNICA membership vinculada na agency e' a do proprio owner (criada
			// pelo CreateAgency). Os dois convites seguem pendentes e SEM principal.
			const bound = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_memberships WHERE agency_id = $1 AND principal_id IS NOT NULL",
				[agencyId],
			);
			expect(bound.rows[0]?.count).toBe(1);
			const pending = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_memberships WHERE agency_id = $1 AND status = 'invited' AND principal_id IS NULL",
				[agencyId],
			);
			expect(pending.rows[0]?.count).toBe(2);

			// O principal da "vitima" nao ganhou membership nenhuma.
			const victimMemberships = await pool.query(
				`SELECT count(*)::int AS count FROM organizations_memberships m
				 JOIN identity_principals p ON p.id = m.principal_id
				 WHERE p.email = $1`,
				["registered-victim@example.com"],
			);
			expect(victimMemberships.rows[0]?.count).toBe(0);
		});
	});

	test("owner transfere para sucessor ativo e publica o evento (caminho legitimo)", async () => {
		await withOrganizationsHttpHarness(async ({ app, createSession, pool }) => {
			const owner = await createSession("owner-happy@example.com");
			const successor = await createSession("successor-happy@example.com");
			const agencyId = await createAgencyFor(app, owner, "Agency Happy");

			// O sucessor precisa de membership ATIVA: convite + aceite pelo proprio
			// principal (o caminho consensual).
			const inviteResponse = await app.handle(
				jsonRequest(
					`/v1/organizations/agencies/${agencyId}/memberships/invite`,
					{
						headers: { ...owner.headers, "idempotency-key": randomUUID() },
						body: { email: "successor-happy@example.com", role: "admin" },
					},
				),
			);
			expect(inviteResponse.status).toBe(200);
			const { inviteToken } = (await inviteResponse.json()) as {
				inviteToken: string;
			};
			expect(typeof inviteToken).toBe("string");
			expect(inviteToken.length).toBeGreaterThan(0);

			const acceptResponse = await app.handle(
				jsonRequest("/v1/organizations/invites/accept", {
					headers: {
						...successor.headers,
						"idempotency-key": randomUUID(),
						"x-forwarded-for": "203.0.113.42",
					},
					body: { token: inviteToken },
				}),
			);
			expect(acceptResponse.status).toBe(200);

			const transferResponse = await app.handle(
				jsonRequest(
					`/v1/organizations/agencies/${agencyId}/ownership/transfer`,
					{
						headers: { ...owner.headers, "idempotency-key": randomUUID() },
						body: { newOwnerPrincipalId: successor.principalId },
					},
				),
			);
			expect(transferResponse.status).toBe(200);

			const agencies = await pool.query<{ owner_principal_id: string }>(
				"SELECT owner_principal_id FROM organizations_agencies WHERE id = $1",
				[agencyId],
			);
			expect(agencies.rows[0]?.owner_principal_id).toBe(successor.principalId);

			const events = await pool.query<{ event_type: string }>(
				`SELECT event_type FROM domain_journal
				 WHERE event_type = 'organizations.agency.ownership_transferred.v1'`,
			);
			expect(events.rows).toHaveLength(1);

			// Exatamente um owner ativo permanece (INV-ORG-02).
			const activeOwners = await pool.query(
				`SELECT count(*)::int AS count FROM organizations_memberships
				 WHERE agency_id = $1 AND role = 'owner' AND status = 'active'`,
				[agencyId],
			);
			expect(activeOwners.rows[0]?.count).toBe(1);
		});
	});
});
