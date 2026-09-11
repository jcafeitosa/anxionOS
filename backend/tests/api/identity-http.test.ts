import { describe, expect, test } from "bun:test";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import {
	type Principal,
	SessionRevocationUnavailableError,
} from "@anxionos/identity";
import { Elysia } from "elysia";
import { createIdentityPlugin } from "../../apps/api/src/identity/plugin";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "../identity/test-support";

/**
 * Testes do boundary HTTP REAL (Elysia `app.handle`), não dos handlers isolados.
 *
 * Os dois pareceres independentes (G2 e G4) apontaram o mesmo gap: `createIdentityPlugin`
 * só era usado para ler `plugin.routes`, então `onError`, os status codes, a
 * conversão de headers e o fail-closed de sessão na borda nunca eram exercitados.
 */

const principalId = "11111111-1111-4111-8111-111111111111";
const otherPrincipalId = "22222222-2222-4222-8222-222222222222";
const agencyId = "33333333-3333-4333-8333-333333333333";
const commandId = "44444444-4444-4444-8444-444444444444";

const activePrincipal: Principal = {
	id: principalId,
	authUserId: "auth-1",
	email: "owner@example.com",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

const targetPrincipal: Principal = {
	id: otherPrincipalId,
	authUserId: "auth-2",
	email: "member@example.com",
	kind: "human",
	status: "active",
	revision: 1,
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	revokedAt: null,
	revocationReason: null,
};

interface HarnessOptions {
	principals?: Principal[];
	capabilities?: string[];
	authUserId?: string | null;
	grantScopeId?: string;
	memberships?: string[];
	/** Agencias de OUTRO principal (alvo), para os testes de escopo do alvo. */
	targetAgencyIds?: string[];
	sessionRevokerFails?: boolean;
}

function harness(options: HarnessOptions = {}) {
	const principalRepository = createInMemoryPrincipalRepository(
		options.principals ?? [activePrincipal],
	);
	const recording = createRecordingUnitOfWork(
		principalRepository,
		createInMemoryServiceIdentityRepository(),
	);
	const authUserId =
		options.authUserId === undefined ? "auth-1" : options.authUserId;
	const grants = options.capabilities ?? [];
	const memberships = options.memberships ?? [];
	const targetAgencies = options.targetAgencyIds ?? [];

	const app = new Elysia().use(
		createIdentityPlugin({
			auth: {
				api: {
					getSession: async ({ headers }) =>
						headers.get("cookie") && authUserId
							? { user: { id: authUserId } }
							: null,
				},
			},
			identityRepository: principalRepository,
			sessionRefRepository: recording.sessionRefRepository,
			identityUnitOfWork: recording.unitOfWork,
			grantRepository: {
				async listActiveByPrincipal() {
					return grants.map((capability) => ({
						id: "66666666-6666-4666-8666-666666666666",
						capability,
						// Sem `grantScopeId` o grant e' de PLATAFORMA (autoridade global).
						scopeId: options.grantScopeId ?? PLATFORM_SCOPE_ID,
						status: "active",
						validFrom: new Date("2026-01-01T00:00:00.000Z"),
						validUntil: null,
					}));
				},
			} as never,
			agencyScope: {
				async isMember(id: string, principal: string) {
					return principal === principalId
						? memberships.includes(id)
						: targetAgencies.includes(id);
				},
				async listAgencyIdsForPrincipal(principal: string) {
					return principal === principalId ? memberships : targetAgencies;
				},
			},
			...(options.sessionRevokerFails
				? {
						sessionRevoker: {
							async revokeAllForAuthUser() {
								throw new SessionRevocationUnavailableError("down");
							},
						},
					}
				: {}),
		}) as never,
	);

	return { app, principalRepository, ...recording };
}

function request(
	path: string,
	init: {
		method?: string;
		cookie?: boolean;
		headers?: Record<string, string>;
		body?: unknown;
	} = {},
): Request {
	const headers = new Headers(init.headers ?? {});
	if (init.cookie !== false) {
		headers.set("cookie", "better-auth.session_token=stub");
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

describe("identity HTTP boundary (/v1/identity)", () => {
	test("sem sessão devolve 401", async () => {
		const { app } = harness();
		const response = await app.handle(
			request(`/v1/identity/principals/${principalId}`, { cookie: false }),
		);
		expect(response.status).toBe(401);
	});

	test("principal suspenso ou revogado não resolve sessão na borda (fail-closed)", async () => {
		for (const status of ["suspended", "revoked"] as const) {
			const { app } = harness({
				principals: [
					{
						...activePrincipal,
						status,
						revision: 2,
						suspendedAt: status === "suspended" ? new Date() : null,
						suspensionReason: status === "suspended" ? "ops.manual" : null,
						revokedAt: status === "revoked" ? new Date() : null,
						revocationReason: status === "revoked" ? "security.incident" : null,
					},
				],
			});
			const response = await app.handle(
				request(`/v1/identity/principals/${principalId}`),
			);
			expect(response.status).toBe(401);
		}
	});

	test("self-access devolve o DTO sem authUserId nem segredo", async () => {
		const { app } = harness();
		const response = await app.handle(
			request(`/v1/identity/principals/${principalId}`),
		);
		expect(response.status).toBe(200);
		const text = await response.text();
		expect(text).not.toContain("auth-1");
		expect(text).not.toContain("authUserId");
		expect(text).not.toContain("secretHash");
		const body = JSON.parse(text);
		expect(body.principal).toMatchObject({
			id: principalId,
			email: "owner@example.com",
			kind: "human",
			status: "active",
			revision: 1,
		});
	});

	test("outro principal sem grant devolve 403 IDN_FORBIDDEN", async () => {
		const { app } = harness({
			principals: [
				activePrincipal,
				{
					...activePrincipal,
					id: otherPrincipalId,
					authUserId: "auth-2",
					email: "other@example.com",
				},
			],
		});
		const response = await app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}`),
		);
		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_FORBIDDEN");
	});

	test("UUID inválido no path devolve 400 VALIDATION_ERROR", async () => {
		const { app } = harness();
		const response = await app.handle(
			request("/v1/identity/principals/not-a-uuid"),
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
	});

	test("agência declarada sem membership devolve 403 IDN_CROSS_TENANT", async () => {
		const { app } = harness();
		const response = await app.handle(
			request(`/v1/identity/principals/${principalId}`, {
				headers: { "x-agency-id": agencyId },
			}),
		);
		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_CROSS_TENANT");
	});

	/**
	 * G2 revalidacao: `scopeId: undefined` em `hasCapability` significava
	 * "qualquer escopo", entao um grant de agencia autorizava rota PLATFORM-global
	 * (aqui, o ledger global de sessoes revogadas) so por omitir o header.
	 */
	test("grant de agência não autoriza rota global sem x-agency-id", async () => {
		const { app } = harness({
			capabilities: ["identity.admin"],
			grantScopeId: agencyId,
			memberships: [agencyId],
		});
		const response = await app.handle(request("/v1/identity/sessions/revoked"));
		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_FORBIDDEN");
	});

	/**
	 * F2 da revalidacao G4: o ledger de sessoes revogadas e' GLOBAL (sessionRefs
	 * nao tem dimensao de agencia), entao exige autoridade de PLATAFORMA — um
	 * grant de agencia, mesmo declarando a propria agencia, nao le metadados de
	 * sessao de outros tenants.
	 */
	test("ledger global de sessões exige autoridade de plataforma", async () => {
		const agencyScoped = harness({
			capabilities: ["identity.admin"],
			grantScopeId: agencyId,
			memberships: [agencyId],
		});
		const denied = await agencyScoped.app.handle(
			request("/v1/identity/sessions/revoked", {
				headers: { "x-agency-id": agencyId },
			}),
		);
		expect(denied.status).toBe(403);
		expect((await denied.json()).error.details.code).toBe("IDN_FORBIDDEN");

		const platform = harness({
			capabilities: ["identity.admin"],
		});
		const allowed = await platform.app.handle(
			request("/v1/identity/sessions/revoked"),
		);
		expect(allowed.status).toBe(200);
	});

	/**
	 * F1 da revalidacao G4 (HIGH, tambem achado por mim): o escopo declarado
	 * limita o ALVO. Sem isto, um grant de agencia A lia (e-mail incluso) e
	 * suspendia principal de qualquer outra agencia.
	 */
	test("grant de agência não opera sobre principal de outra agência", async () => {
		const foreign = harness({
			principals: [activePrincipal, targetPrincipal],
			capabilities: ["identity.admin"],
			grantScopeId: agencyId,
			memberships: [agencyId],
			targetAgencyIds: ["99999999-9999-4999-8999-999999999999"],
		});
		const read = await foreign.app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}`, {
				headers: { "x-agency-id": agencyId },
			}),
		);
		expect(read.status).toBe(403);
		expect((await read.json()).error.details.code).toBe("IDN_CROSS_TENANT");

		const suspend = await foreign.app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}/suspend`, {
				method: "POST",
				headers: {
					"x-agency-id": agencyId,
					"idempotency-key": commandId,
				},
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(suspend.status).toBe(403);
		expect((await suspend.json()).error.details.code).toBe("IDN_CROSS_TENANT");
	});

	test("grant de agência opera sobre principal membro da mesma agência", async () => {
		const { app } = harness({
			principals: [activePrincipal, targetPrincipal],
			// `identity.read`: D-IDN-034 — admin NAO implica read.
			capabilities: ["identity.read"],
			grantScopeId: agencyId,
			memberships: [agencyId],
			targetAgencyIds: [agencyId],
		});
		const response = await app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}`, {
				headers: { "x-agency-id": agencyId },
			}),
		);
		expect(response.status).toBe(200);
	});

	/**
	 * F5 da revalidacao G4: replay de register falha FECHADO quando o principal
	 * encontrado nao esta ativo — antes devolvia 200 com o DTO (e-mail incluso)
	 * enquanto `GET /principals/:id` devolvia 404.
	 */
	test("register de authUserId suspenso falha fechado (404, não 200)", async () => {
		const { app } = harness({
			principals: [
				activePrincipal,
				{
					...activePrincipal,
					id: otherPrincipalId,
					authUserId: "auth-susp",
					status: "suspended",
					revision: 2,
				},
			],
			capabilities: ["identity.admin"],
		});
		const response = await app.handle(
			request("/v1/identity/principals", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { authUserId: "auth-susp", email: "susp@example.com" },
			}),
		);
		expect(response.status).toBe(404);
		expect((await response.json()).error.details.code).toBe(
			"IDN_PRINCIPAL_NOT_FOUND",
		);
	});

	test("suspend exige Idempotency-Key (400) e aplica com a key (200)", async () => {
		const { app } = harness({ capabilities: ["identity.admin"] });
		const withoutKey = await app.handle(
			request(`/v1/identity/principals/${principalId}/suspend`, {
				method: "POST",
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(withoutKey.status).toBe(400);

		const applied = await app.handle(
			request(`/v1/identity/principals/${principalId}/suspend`, {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(applied.status).toBe(200);
		expect((await applied.json()).principal.status).toBe("suspended");
	});

	test("suspend com corpo vazio ou ausente não vira 500", async () => {
		const first = harness({ capabilities: ["identity.admin"] });
		const emptyBody = await first.app.handle(
			request(`/v1/identity/principals/${principalId}/suspend`, {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: {},
			}),
		);
		expect(emptyBody.status).toBe(200);

		const second = harness({ capabilities: ["identity.admin"] });
		const noBody = await second.app.handle(
			request(`/v1/identity/principals/${principalId}/suspend`, {
				method: "POST",
				headers: { "idempotency-key": commandId },
			}),
		);
		expect(noBody.status).toBe(200);
	});

	test("reuso da Idempotency-Key para outro principal devolve 409", async () => {
		// Ator = auth-2 (P2, com identity.admin), alvo = P1. O ator precisa ficar
		// ATIVO, senao a propria borda responde 401 antes de chegar ao comando.
		const { app } = harness({
			capabilities: ["identity.admin"],
			authUserId: "auth-2",
			principals: [
				activePrincipal,
				{
					...activePrincipal,
					id: otherPrincipalId,
					authUserId: "auth-2",
					email: "other@example.com",
				},
			],
		});
		const first = await app.handle(
			request(`/v1/identity/principals/${principalId}/suspend`, {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(first.status).toBe(200);
		// mesma key, OUTRO agregado: conflito, nao replay silencioso
		const reused = await app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}/suspend`, {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(reused.status).toBe(409);
		expect((await reused.json()).error.details.code).toBe(
			"IDN_DUPLICATE_IDEMPOTENCY",
		);
	});

	test("falha do revoker inline devolve 503 IDN_IDENTITY_UNAVAILABLE", async () => {
		const { app } = harness({
			capabilities: ["identity.admin"],
			sessionRevokerFails: true,
		});
		const response = await app.handle(
			request(`/v1/identity/principals/${principalId}/suspend`, {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(response.status).toBe(503);
		expect((await response.json()).error.details.code).toBe(
			"IDN_IDENTITY_UNAVAILABLE",
		);
	});

	test("sessões de principal revogado devolvem 404 (fail-closed)", async () => {
		// Ator ativo (auth-2) consultando as sessoes de um principal REVOGADO.
		const { app } = harness({
			// A leitura exige identity.read (identity.admin nao implica read em R04).
			capabilities: ["identity.read"],
			authUserId: "auth-2",
			principals: [
				{
					...activePrincipal,
					status: "revoked",
					revision: 3,
					revokedAt: new Date(),
					revocationReason: "security.incident",
				},
				{
					...activePrincipal,
					id: otherPrincipalId,
					authUserId: "auth-2",
					email: "other@example.com",
				},
			],
		});
		const response = await app.handle(
			request(`/v1/identity/principals/${principalId}/sessions`),
		);
		expect(response.status).toBe(404);
		expect((await response.json()).error.details.code).toBe(
			"IDN_PRINCIPAL_NOT_FOUND",
		);
	});

	test("POST /sessions/revoke grava a referência e devolve transitioned", async () => {
		const { app, sessionRefRepository } = harness();
		const response = await app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: {
					principalId,
					sessionRefId: "77777777-7777-4777-8777-777777777777",
					externalRefHash: "a".repeat(64),
				},
			}),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body.transitioned).toBe(true);
		expect(body.sessionRef.status).toBe("revoked");
		expect(JSON.stringify(body)).not.toContain("a".repeat(64));
		const stored = await sessionRefRepository.findById(
			"77777777-7777-4777-8777-777777777777",
		);
		expect(stored?.status).toBe("revoked");
	});

	/**
	 * HIGH da revalidacao G5 (IDOR): a autorizacao usa o `principalId` DECLARADO
	 * pelo chamador, mas o agregado e' a sessionRef. Sem checar a posse, qualquer
	 * autenticado revogava a sessao de OUTRO principal so conhecendo o UUID.
	 */
	test("self-access não revoga sessão de outro principal (IDOR)", async () => {
		const victimSessionId = "77777777-7777-4777-8777-777777777777";
		const h = harness({ principals: [activePrincipal, targetPrincipal] });
		await h.sessionRefRepository.create({
			id: victimSessionId,
			principalId: otherPrincipalId,
			externalRefHash: "a".repeat(64),
		});

		const response = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { principalId, sessionRefId: victimSessionId },
			}),
		);
		expect(response.status).toBe(404);
		expect((await response.json()).error.details.code).toBe(
			"IDN_SESSION_NOT_FOUND",
		);

		// a sessão da vítima continua ativa
		const victim = await h.sessionRefRepository.findById(victimSessionId);
		expect(victim?.status).toBe("active");
	});

	/**
	 * ANX-467 (MEDIUM do G4): a posse e' invariante do AGREGADO, nao do caminho
	 * de resolucao. O ramo por id foi fechado em D-IDN-043; quando o id era
	 * desconhecido, `recordRevoked` resolvia a linha pelo hash e revogava a
	 * sessao de OUTRO principal.
	 */
	test("self-access com id arbitrário + hash de terceiro não revoga sessão alheia (ANX-467)", async () => {
		const victimSessionId = "77777777-7777-4777-8777-777777777777";
		const attackerRefId = "88888888-8888-4888-8888-888888888888";
		const victimHash = "a".repeat(64);
		const h = harness({ principals: [activePrincipal, targetPrincipal] });
		await h.sessionRefRepository.create({
			id: victimSessionId,
			principalId: otherPrincipalId,
			externalRefHash: victimHash,
		});

		const response = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: {
					principalId,
					// id sem posse: a linha e' resolvida pelo hash da vitima
					sessionRefId: attackerRefId,
					externalRefHash: victimHash,
				},
			}),
		);
		expect(response.status).toBe(404);
		expect((await response.json()).error.details.code).toBe(
			"IDN_SESSION_NOT_FOUND",
		);

		// a sessão da vítima continua ativa e o id arbitrario nao foi criado
		expect(
			(await h.sessionRefRepository.findById(victimSessionId))?.status,
		).toBe("active");
		expect(await h.sessionRefRepository.findById(attackerRefId)).toBeNull();
	});

	/**
	 * ANX-467 (3o caminho): o replay pelo journal devolvia o DTO da referencia
	 * ANTES de qualquer checagem de posse.
	 */
	test("replay do journal não devolve DTO de sessão de terceiro (ANX-467)", async () => {
		const victimSessionId = "77777777-7777-4777-8777-777777777777";
		const victimKey = "55555555-5555-4555-8555-555555555555";
		const h = harness({
			principals: [activePrincipal, targetPrincipal],
			capabilities: ["identity.admin"],
		});
		const victim = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": victimKey },
				body: {
					principalId: otherPrincipalId,
					sessionRefId: victimSessionId,
					externalRefHash: "b".repeat(64),
				},
			}),
		);
		expect(victim.status).toBe(200);
		expect((await victim.json()).sessionRef.principalId).toBe(otherPrincipalId);

		// self-access reusa a key de terceiro no MESMO agregado
		const attack = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": victimKey },
				body: { principalId, sessionRefId: victimSessionId },
			}),
		);
		expect(attack.status).toBe(404);
		expect((await attack.json()).error.details.code).toBe(
			"IDN_SESSION_NOT_FOUND",
		);
	});

	/**
	 * ANX-467, aceite 4: os caminhos legitimos continuam 200 — criar/revogar a
	 * PROPRIA referencia (por id e por hash) e admin de plataforma revogando
	 * sessao de terceiro com o `principalId` correto.
	 */
	test("própria referência (por id e por hash) e admin legítimo continuam 200 (ANX-467)", async () => {
		const ownById = "77777777-7777-4777-8777-777777777777";
		const ownByHash = "99999999-9999-4999-8999-999999999999";
		const ownHash = "c".repeat(64);
		const h = harness();
		await h.sessionRefRepository.create({
			id: ownById,
			principalId,
			externalRefHash: "d".repeat(64),
		});
		await h.sessionRefRepository.create({
			id: ownByHash,
			principalId,
			externalRefHash: ownHash,
		});

		const byId = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { principalId, sessionRefId: ownById },
			}),
		);
		expect(byId.status).toBe(200);
		expect((await byId.json()).transitioned).toBe(true);

		// id logico desconhecido + hash da PROPRIA referencia
		const byHash = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": "66666666-6666-4666-8666-666666666666" },
				body: {
					principalId,
					sessionRefId: "12121212-1212-4212-8212-121212121212",
					externalRefHash: ownHash,
				},
			}),
		);
		expect(byHash.status).toBe(200);
		expect((await byHash.json()).sessionRef.sessionRefId).toBe(ownByHash);
	});

	test("admin de plataforma revoga sessão de terceiro com o principalId correto (ANX-467)", async () => {
		const victimSessionId = "77777777-7777-4777-8777-777777777777";
		const h = harness({
			principals: [activePrincipal, targetPrincipal],
			capabilities: ["identity.admin"],
		});
		await h.sessionRefRepository.create({
			id: victimSessionId,
			principalId: otherPrincipalId,
			externalRefHash: "e".repeat(64),
		});
		const response = await h.app.handle(
			request("/v1/identity/sessions/revoke", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { principalId: otherPrincipalId, sessionRefId: victimSessionId },
			}),
		);
		expect(response.status).toBe(200);
		expect((await response.json()).transitioned).toBe(true);
		expect(
			(await h.sessionRefRepository.findById(victimSessionId))?.status,
		).toBe("revoked");
	});

	/**
	 * ANX-464: a coluna guarda SO derivacao. Um token cru, uma string curta ou
	 * um hex de tamanho errado sao recusados com 400 no boundary (o comando
	 * revalida com o mesmo schema — defense in depth).
	 */
	test("externalRefHash fora do formato sha256 é 400 VALIDATION_ERROR (ANX-464)", async () => {
		const h = harness();
		const invalid = [
			"raw-session-token", // token cru
			"abc", // string curta
			"a".repeat(63), // hex de tamanho errado
			"a".repeat(128),
			`g${"a".repeat(63)}`, // 64 chars, nao-hex
		];
		for (const externalRefHash of invalid) {
			const response = await h.app.handle(
				request("/v1/identity/sessions/revoke", {
					method: "POST",
					headers: {
						"idempotency-key": "12121212-1212-4212-8212-121212121212",
					},
					body: {
						principalId,
						sessionRefId: "77777777-7777-4777-8777-777777777777",
						externalRefHash,
					},
				}),
			);
			expect(response.status).toBe(400);
			expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
		}
	});

	/**
	 * N1 do G2 / F-G5-2 do G5: o principal criado e' GLOBAL e o replay devolve o
	 * DTO (com e-mail) de um principal existente. Sem exigir plataforma, um admin
	 * de agencia lia e-mail de outro tenant pelo `authUserId`, criava principals
	 * globais e fazia squatting de e-mail.
	 */
	test("register exige autoridade de plataforma, não basta agência", async () => {
		const agencyScoped = harness({
			capabilities: ["identity.admin"],
			grantScopeId: agencyId,
			memberships: [agencyId],
		});
		const denied = await agencyScoped.app.handle(
			request("/v1/identity/principals", {
				method: "POST",
				headers: {
					"idempotency-key": commandId,
					"x-agency-id": agencyId,
				},
				body: { authUserId: "auth-new", email: "new@example.com" },
			}),
		);
		expect(denied.status).toBe(403);
		expect((await denied.json()).error.details.code).toBe("IDN_FORBIDDEN");
	});

	test("register com autoridade de plataforma cria o principal", async () => {
		const platform = harness({ capabilities: ["identity.admin"] });
		const created = await platform.app.handle(
			request("/v1/identity/principals", {
				method: "POST",
				headers: { "idempotency-key": commandId },
				body: { authUserId: "auth-new", email: "new@example.com" },
			}),
		);
		expect(created.status).toBe(200);
		expect((await created.json()).principal.email).toBe("new@example.com");
	});

	/**
	 * N3 do G2: o ledger e' global (exige plataforma) mas declarar uma agencia
	 * estrangeira continua sendo sinal de cross-tenant, como em H2.
	 */
	test("ledger com agência declarada estrangeira devolve IDN_CROSS_TENANT", async () => {
		const { app } = harness({ capabilities: ["identity.admin"] });
		const response = await app.handle(
			request("/v1/identity/sessions/revoked", {
				headers: { "x-agency-id": agencyId },
			}),
		);
		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_CROSS_TENANT");
	});

	/**
	 * LOW NEW-3 da revalidacao G4: header presente com valor VAZIO era falsy e
	 * caia no mesmo ramo da ausencia ("sem escopo"), contrariando o invariante de
	 * que um header presente e invalido nunca vira sem escopo.
	 */
	test("x-agency-id vazio é 400, não 'sem escopo'", async () => {
		const { app } = harness({ capabilities: ["identity.read"] });
		const response = await app.handle(
			request(`/v1/identity/principals/${principalId}`, {
				headers: { "x-agency-id": "" },
			}),
		);
		expect(response.status).toBe(400);
		expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
	});

	/**
	 * ANX-465 (HIGH da revalidacao G4): o alvo so' e' gerenciavel por agencia se
	 * NAO tiver vinculo ativo em outra. A assisted activation de organizations
	 * permite anexar um principal de outro tenant a agencia do atacante; sem esta
	 * regra, o escopo do alvo passava a autorizar ler o e-mail dele e suspende-lo.
	 */
	test("alvo com vínculo ativo em OUTRA agência exige plataforma", async () => {
		const foreignAgency = "99999999-9999-4999-8999-999999999999";
		const agencyScoped = harness({
			principals: [activePrincipal, targetPrincipal],
			capabilities: ["identity.read"],
			grantScopeId: agencyId,
			memberships: [agencyId],
			// o alvo foi anexado a A pelo atacante, mas tem casa em outra agencia
			targetAgencyIds: [agencyId, foreignAgency],
		});
		const denied = await agencyScoped.app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}`, {
				headers: { "x-agency-id": agencyId },
			}),
		);
		expect(denied.status).toBe(403);
		expect((await denied.json()).error.details.code).toBe("IDN_CROSS_TENANT");

		const suspend = await agencyScoped.app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}/suspend`, {
				method: "POST",
				headers: { "x-agency-id": agencyId, "idempotency-key": commandId },
				body: { reasonCode: "ops.manual" },
			}),
		);
		expect(suspend.status).toBe(403);

		// autoridade de plataforma continua operando sobre qualquer alvo
		const platform = harness({
			principals: [activePrincipal, targetPrincipal],
			capabilities: ["identity.read"],
			targetAgencyIds: [foreignAgency],
		});
		const allowed = await platform.app.handle(
			request(`/v1/identity/principals/${otherPrincipalId}`),
		);
		expect(allowed.status).toBe(200);
	});
});
