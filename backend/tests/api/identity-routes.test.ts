import { describe, expect, test } from "bun:test";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { IDENTITY_ERROR_CODES } from "@anxionos/contracts/identity";
import {
	IdentityCommandError,
	type Principal,
	SessionRevocationUnavailableError,
} from "@anxionos/identity";
import { createAgencyScope } from "../../apps/api/src/identity/agency-scope";
import {
	requireIdentityGrant,
	requireSelfOrGrant,
} from "../../apps/api/src/identity/authorization";
import { mapIdentityError } from "../../apps/api/src/identity/error-handler";
import {
	handleGetPrincipal,
	handleListSessions,
	handleRegisterPrincipal,
	handleRevokePrincipal,
	handleRevokeSession,
	handleSuspendPrincipal,
} from "../../apps/api/src/identity/handlers";
import { createIdentityPlugin } from "../../apps/api/src/identity/plugin";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "../identity/test-support";

const principalId = "11111111-1111-4111-8111-111111111111";
const otherPrincipalId = "22222222-2222-4222-8222-222222222222";
const agencyId = "33333333-3333-4333-8333-333333333333";
const commandId = "44444444-4444-4444-8444-444444444444";
const sessionRefId = "55555555-5555-4555-8555-555555555555";

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

function grantRepository(capabilities: string[] = [], scopeId?: string) {
	return {
		async listActiveByPrincipal() {
			return capabilities.map((capability) => ({
				id: "66666666-6666-4666-8666-666666666666",
				capability,
				// Sem escopo declarado o grant e' de PLATAFORMA (ANX-462).
				scopeId: scopeId ?? PLATFORM_SCOPE_ID,
				status: "active",
				validFrom: new Date("2026-01-01T00:00:00.000Z"),
				validUntil: null,
			}));
		},
	} as never;
}

function deps(
	overrides: {
		capabilities?: string[];
		principals?: Principal[];
		memberships?: string[];
	} = {},
) {
	const identityRepository = createInMemoryPrincipalRepository(
		overrides.principals ?? [activePrincipal],
	);
	const recording = createRecordingUnitOfWork(
		identityRepository,
		createInMemoryServiceIdentityRepository(),
	);
	return {
		...recording,
		identityUnitOfWork: recording.unitOfWork,
		identityRepository,
		auth: { api: { getSession: async () => null } },
		grantRepository: grantRepository(
			overrides.capabilities ?? [],
			overrides.grantScopeId,
		),
		agencyScope: {
			async isMember(id: string) {
				return (overrides.memberships ?? []).includes(id);
			},
			async listAgencyIdsForPrincipal() {
				return overrides.memberships ?? [];
			},
		},
	};
}

describe("identity API error mapping (R04)", () => {
	test("maps IDN codes to the documented HTTP status", () => {
		const cases: Array<[keyof typeof IDENTITY_ERROR_CODES, number]> = [
			["IDN_PRINCIPAL_NOT_FOUND", 404],
			["IDN_FORBIDDEN", 403],
			["IDN_CROSS_TENANT", 403],
			["IDN_REVISION_CONFLICT", 409],
			["IDN_DUPLICATE_IDEMPOTENCY", 409],
			["IDN_PRINCIPAL_REVOKED", 409],
			["IDN_SESSION_REVOKED", 401],
			["IDN_IDENTITY_UNAVAILABLE", 503],
		];
		for (const [code, status] of cases) {
			const mapped = mapIdentityError(
				new IdentityCommandError(code as never, "x"),
			);
			expect(mapped.status).toBe(status);
			expect(mapped.body.error.details).toEqual({ code });
		}
	});

	test("session revoker failure maps to 503 IDN_IDENTITY_UNAVAILABLE, not 500", () => {
		const mapped = mapIdentityError(
			new SessionRevocationUnavailableError("revoker down"),
			"req-x",
		);
		expect(mapped.status).toBe(503);
		expect(mapped.body.error.details).toEqual({
			code: "IDN_IDENTITY_UNAVAILABLE",
		});
	});

	test("keeps the institutional envelope for unknown failures", () => {
		const mapped = mapIdentityError(new Error("boom"), "req-1");
		expect(mapped.status).toBe(500);
		expect(mapped.body.error.message).toBeDefined();
	});
});

describe("identity authorization", () => {
	test("self-access needs no grant, other principals do", async () => {
		const withGrant = deps({ capabilities: ["identity.read"] });
		await expect(
			requireSelfOrGrant(withGrant, {
				actorPrincipalId: principalId,
				targetPrincipalId: principalId,
				capability: "identity.read",
			}),
		).resolves.toBeUndefined();

		const withoutGrant = deps();
		await expect(
			requireSelfOrGrant(withoutGrant, {
				actorPrincipalId: principalId,
				targetPrincipalId: otherPrincipalId,
				capability: "identity.read",
			}),
		).rejects.toMatchObject({ identityCode: "IDN_FORBIDDEN" });
	});

	test("declared agency without membership is cross-tenant, not forbidden", async () => {
		const withoutMembership = deps({ capabilities: ["identity.admin"] });
		await expect(
			requireIdentityGrant(withoutMembership, {
				principalId,
				capability: "identity.admin",
				agencyId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_CROSS_TENANT" });

		// Com membership, o grant precisa cobrir a agencia declarada: um grant
		// emitido para OUTRA agencia nao autoriza operar sob esta (A5 do G2).
		const wrongScope = deps({
			capabilities: ["identity.admin"],
			memberships: [agencyId],
			grantScopeId: "99999999-9999-4999-8999-999999999999",
		});
		await expect(
			requireIdentityGrant(wrongScope, {
				principalId,
				capability: "identity.admin",
				agencyId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_FORBIDDEN" });

		const withMembership = deps({
			capabilities: ["identity.admin"],
			memberships: [agencyId],
			grantScopeId: agencyId,
		});
		await expect(
			requireIdentityGrant(withMembership, {
				principalId,
				capability: "identity.admin",
				agencyId,
			}),
		).resolves.toBeUndefined();
	});

	test("agency scope adapter reads organizations membership", async () => {
		const scope = createAgencyScope({
			async listActiveByPrincipal() {
				return [{ agencyId }, { agencyId }];
			},
		} as never);
		expect(await scope.isMember(agencyId, principalId)).toBe(true);
		expect(await scope.listAgencyIdsForPrincipal(principalId)).toEqual([
			agencyId,
		]);
	});
});

describe("identity handlers", () => {
	test("get principal hides suspended and revoked principals (404)", async () => {
		const active = deps({ capabilities: ["identity.read"] });
		const found = await handleGetPrincipal(active, {
			params: { principalId },
			actorPrincipalId: otherPrincipalId,
		});
		expect(found.principal.id).toBe(principalId);
		expect(JSON.stringify(found)).not.toContain("auth-1");

		const suspended = deps({
			capabilities: ["identity.read"],
			principals: [
				{
					...activePrincipal,
					status: "suspended",
					revision: 2,
					suspendedAt: new Date(),
					suspensionReason: "ops.manual",
				},
			],
		});
		await expect(
			handleGetPrincipal(suspended, {
				params: { principalId },
				actorPrincipalId: otherPrincipalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_NOT_FOUND" });
	});

	test("self-access with a foreign agency header is cross-tenant (H2 do G4)", async () => {
		// actor == target normalmente dispensa grant, mas declarar agencia
		// estrangeira continua sendo sinal cross-tenant.
		const d = deps({ memberships: [] });
		await expect(
			requireSelfOrGrant(d, {
				actorPrincipalId: principalId,
				targetPrincipalId: principalId,
				capability: "identity.read",
				agencyId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_CROSS_TENANT" });
	});

	test("session list fails closed for suspended/revoked and unknown principals (H1 do G4)", async () => {
		const revoked = deps({
			capabilities: ["identity.read"],
			principals: [
				{
					...activePrincipal,
					status: "revoked",
					revision: 3,
					revokedAt: new Date(),
					revocationReason: "security.incident",
				},
			],
		});
		await expect(
			handleListSessions(revoked, {
				params: { principalId },
				actorPrincipalId: otherPrincipalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_NOT_FOUND" });

		const unknown = deps({ capabilities: ["identity.read"] });
		await expect(
			handleListSessions(unknown, {
				params: { principalId: "99999999-9999-4999-8999-999999999999" },
				actorPrincipalId: otherPrincipalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_PRINCIPAL_NOT_FOUND" });
	});

	test("register requires the Idempotency-Key header", async () => {
		const d = deps({ capabilities: ["identity.admin"] });
		await expect(
			handleRegisterPrincipal(d, {
				headers: new Headers(),
				body: { authUserId: "auth-9", email: "new@example.com" },
				actorPrincipalId: otherPrincipalId,
			}),
		).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
	});

	test("register with grant and key creates the principal", async () => {
		const d = deps({ capabilities: ["identity.admin"] });
		const result = await handleRegisterPrincipal(d, {
			headers: new Headers({ "idempotency-key": commandId }),
			body: { authUserId: "auth-9", email: "new@example.com" },
			actorPrincipalId: otherPrincipalId,
		});
		expect(result.principal.email).toBe("new@example.com");
		expect(result.principal.status).toBe("active");
	});

	test("suspend needs identity.admin and returns the suspended DTO", async () => {
		const d = deps({ capabilities: ["identity.admin"] });
		const result = await handleSuspendPrincipal(d, {
			params: { principalId },
			headers: new Headers({ "idempotency-key": commandId }),
			body: { reasonCode: "security.incident" },
			actorPrincipalId: otherPrincipalId,
		});
		expect(result.principal.status).toBe("suspended");
		expect(d.published.some((e) => e.eventType.endsWith("suspended.v1"))).toBe(
			true,
		);
	});

	test("reusing an Idempotency-Key for another principal is a conflict, not a replay", async () => {
		const d = deps({
			capabilities: ["identity.admin"],
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
		const headers = new Headers({ "idempotency-key": commandId });
		await handleSuspendPrincipal(d, {
			params: { principalId },
			headers,
			body: { reasonCode: "ops.manual" },
			actorPrincipalId: principalId,
		});
		// mesma key, OUTRO principal: R04 exige conflito, nao replay silencioso
		await expect(
			handleSuspendPrincipal(d, {
				params: { principalId: otherPrincipalId },
				headers,
				body: { reasonCode: "ops.manual" },
				actorPrincipalId: principalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_DUPLICATE_IDEMPOTENCY" });
		const untouched = await d.identityRepository.findById(otherPrincipalId);
		expect(untouched?.status).toBe("active");
	});

	test("reusing an Idempotency-Key for another authUserId in register is a conflict", async () => {
		const d = deps({ capabilities: ["identity.admin"] });
		const headers = new Headers({ "idempotency-key": commandId });
		await handleRegisterPrincipal(d, {
			headers,
			body: { authUserId: "auth-first", email: "first@example.com" },
			actorPrincipalId: principalId,
		});
		await expect(
			handleRegisterPrincipal(d, {
				headers,
				body: { authUserId: "auth-second", email: "second@example.com" },
				actorPrincipalId: principalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_DUPLICATE_IDEMPOTENCY" });
	});

	test("reusing an Idempotency-Key for another session is a conflict", async () => {
		const d = deps();
		const headers = new Headers({ "idempotency-key": commandId });
		await handleRevokeSession(d, {
			headers,
			body: { principalId, sessionRefId, externalRefHash: "a".repeat(64) },
			actorPrincipalId: principalId,
		});
		await expect(
			handleRevokeSession(d, {
				headers,
				body: {
					principalId,
					sessionRefId: "77777777-7777-4777-8777-777777777777",
					externalRefHash: "b".repeat(64),
				},
				actorPrincipalId: principalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_DUPLICATE_IDEMPOTENCY" });
	});

	test("body vazio/ausente em suspend e revoke nao vira 500 (defaults do contrato)", async () => {
		const d = deps({ capabilities: ["identity.admin"] });
		const suspended = await handleSuspendPrincipal(d, {
			params: { principalId },
			headers: new Headers({ "idempotency-key": commandId }),
			body: {},
			actorPrincipalId: principalId,
		});
		expect(suspended.principal.status).toBe("suspended");
		expect(suspended.principal.suspensionReason).toBe("ops.manual");

		const revoked = await handleRevokePrincipal(d, {
			params: { principalId },
			headers: new Headers({
				"idempotency-key": "88888888-8888-4888-8888-888888888888",
			}),
			body: undefined,
			actorPrincipalId: principalId,
		});
		expect(revoked.principal.status).toBe("revoked");
	});

	test("UUID invalido no path vira 400 VALIDATION_ERROR, nao 500", async () => {
		const d = deps({ capabilities: ["identity.read"] });
		let thrown: unknown;
		try {
			await handleGetPrincipal(d, {
				params: { principalId: "not-a-uuid" },
				actorPrincipalId: principalId,
			});
		} catch (error) {
			thrown = error;
		}
		const mapped = mapIdentityError(thrown, "req-test");
		expect(mapped.status).toBe(400);
		expect(mapped.body.error.code).toBe("VALIDATION_ERROR");
	});

	test("session revoke allows self and rejects unknown principal", async () => {
		const d = deps();
		const result = await handleRevokeSession(d, {
			headers: new Headers({ "idempotency-key": commandId }),
			body: {
				principalId,
				sessionRefId,
				externalRefHash: "a".repeat(64),
			},
			actorPrincipalId: principalId,
		});
		expect(result.transitioned).toBe(true);

		await expect(
			handleRevokeSession(d, {
				headers: new Headers({ "idempotency-key": commandId }),
				body: {
					principalId: "99999999-9999-4999-8999-999999999999",
					sessionRefId,
					externalRefHash: "b".repeat(64),
				},
				actorPrincipalId: principalId,
			}),
		).rejects.toMatchObject({ identityCode: "IDN_FORBIDDEN" });
	});
});

describe("identity plugin surface", () => {
	test("mounts the documented R04 routes", () => {
		const plugin = createIdentityPlugin(deps() as never);
		const routes = plugin.routes.map((route) => route.path);
		expect(routes).toContain("/v1/identity/principals");
		expect(routes).toContain("/v1/identity/principals/:principalId");
		expect(routes).toContain("/v1/identity/principals/:principalId/sessions");
		expect(routes).toContain("/v1/identity/principals/:principalId/suspend");
		expect(routes).toContain("/v1/identity/principals/:principalId/revoke");
		expect(routes).toContain("/v1/identity/sessions/revoke");
		expect(routes).toContain("/v1/identity/sessions/revoked");
	});
});
