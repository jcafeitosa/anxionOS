import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import type { Principal } from "@anxionos/identity";
import { Elysia } from "elysia";
import { createIdentityPlugin } from "../../apps/api/src/identity/plugin";
import {
	createInMemoryPrincipalRepository,
	createInMemoryServiceIdentityRepository,
	createRecordingUnitOfWork,
} from "./test-support";

const alicePrincipal: Principal = {
	id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	authUserId: "alice-auth",
	email: "alice@test.anxion.os",
	status: "active",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
};

const bobPrincipal: Principal = {
	id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	authUserId: "bob-auth",
	email: "bob@test.anxion.os",
	status: "active",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: null,
	suspensionReason: null,
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
};

const agencyA = "11111111-1111-4111-8111-111111111111";
const agencyB = "22222222-2222-4222-8222-222222222222";

interface HarnessOptions {
	principals?: Principal[];
	capabilities?: string[];
	authUserId?: string | null;
	grantScopeId?: string;
	memberships?: string[];
	targetAgencyIds?: string[];
}

function harness(options: HarnessOptions = {}) {
	const principalRepository = createInMemoryPrincipalRepository(
		options.principals ?? [alicePrincipal],
	);
	const recording = createRecordingUnitOfWork(
		principalRepository,
		createInMemoryServiceIdentityRepository(),
	);
	const authUserId =
		options.authUserId === undefined ? "alice-auth" : options.authUserId;
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
						scopeId: options.grantScopeId ?? PLATFORM_SCOPE_ID,
						scopeKind: options.grantScopeId === PLATFORM_SCOPE_ID ? ("platform" as const) : ("agency" as const),
						granteePrincipalId: alicePrincipal.id,
						granteeAgentId: null,
						issuedByPrincipalId: null,
						resourceRef: null,
						status: "active" as const,
						validFrom: new Date(),
						validUntil: null,
						derivedFromMembershipId: null,
						authorityEpochAtIssue: 1,
						revision: 1,
						createdAt: new Date(),
						updatedAt: new Date(),
					}));
				},
			},
			agencyScope: {
				async isMember(agencyId, principalId) {
					return memberships.includes(agencyId) && principalId === alicePrincipal.id;
				},
				async listAgencyIdsForPrincipal(principalId) {
					if (principalId === alicePrincipal.id) {
						return memberships;
					}
					return targetAgencies;
				},
			},
		}),
	);

	return { app, published: recording.published };
}

describe("ANX-465 — cross-tenant isolation (HTTP)", () => {
	function request(path: string, opts: { headers?: Record<string, string>; method?: string; body?: unknown } = {}) {
		return new Request(`http://127.0.0.1${path}`, {
			method: opts.method ?? "GET",
			headers: {
				"content-type": "application/json",
				cookie: "session=mock",
				...opts.headers,
			},
			body: opts.body ? JSON.stringify(opts.body) : undefined,
		});
	}

	test("ABUSE CASE 1 — actor cannot declare agency membership they don't have", async () => {
		// Alice is only in agency A, tries to declare agency B
		const { app } = harness({
			principals: [alicePrincipal, bobPrincipal],
			capabilities: ["identity.read"],
			grantScopeId: agencyA,
			memberships: [agencyA],
			targetAgencyIds: [],
		});

		const response = await app.handle(
			request(`/v1/identity/principals/${alicePrincipal.id}`, {
				headers: { "x-agency-id": agencyB },
			}),
		);

		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_CROSS_TENANT");
	});

	test("ABUSE CASE 2 — agency A actor cannot suspend principal belonging only to agency B", async () => {
		// Alice in agency A with identity.admin grant, Bob only in agency B
		const { app } = harness({
			principals: [alicePrincipal, bobPrincipal],
			capabilities: ["identity.admin"],
			grantScopeId: agencyA,
			memberships: [agencyA],
			targetAgencyIds: [agencyB],
		});

		const response = await app.handle(
			request(`/v1/identity/principals/${bobPrincipal.id}/suspend`, {
				method: "POST",
				headers: {
					"x-agency-id": agencyA,
					"idempotency-key": randomUUID(),
				},
				body: { reasonCode: "ops.manual" },
			}),
		);

		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_CROSS_TENANT");
	});

	test("ABUSE CASE 3 — multi-agency principal requires PLATFORM scope", async () => {
		// Bob belongs to both agencies, agency-scoped grant cannot operate on him
		const { app } = harness({
			principals: [alicePrincipal, bobPrincipal],
			capabilities: ["identity.admin"],
			grantScopeId: agencyA,
			memberships: [agencyA],
			targetAgencyIds: [agencyA, agencyB], // Bob is in both
		});

		const response = await app.handle(
			request(`/v1/identity/principals/${bobPrincipal.id}/suspend`, {
				method: "POST",
				headers: {
					"x-agency-id": agencyA,
					"idempotency-key": randomUUID(),
				},
				body: { reasonCode: "ops.manual" },
			}),
		);

		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_CROSS_TENANT");
	});

	test("VALID CASE — PLATFORM scope can operate on any principal", async () => {
		// PLATFORM authority (no x-agency-id) can suspend any principal
		const { app } = harness({
			principals: [alicePrincipal, bobPrincipal],
			capabilities: ["identity.admin"],
			grantScopeId: PLATFORM_SCOPE_ID,
			memberships: [],
			targetAgencyIds: [agencyB],
		});

		const response = await app.handle(
			request(`/v1/identity/principals/${bobPrincipal.id}/suspend`, {
				method: "POST",
				headers: {
					"idempotency-key": randomUUID(),
				},
				body: { reasonCode: "ops.manual" },
			}),
		);

		expect(response.status).toBe(200);
	});

	test("C2 — empty x-agency-id is validation 400 (not platform scope)", async () => {
		const { app } = harness({
			principals: [alicePrincipal, bobPrincipal],
			capabilities: ["identity.admin"],
			grantScopeId: agencyA,
			memberships: [agencyA],
			targetAgencyIds: [agencyB],
		});

		const response = await app.handle(
			request(`/v1/identity/principals/${bobPrincipal.id}/suspend`, {
				method: "POST",
				headers: {
					"x-agency-id": "",
					"idempotency-key": randomUUID(),
				},
				body: { reasonCode: "ops.manual" },
			}),
		);

		expect(response.status).toBe(400);
		const body = await response.json();
		expect(body.error.code).toBe("VALIDATION_ERROR");
	});

	test("C2 — omit x-agency-id with agency-scoped grant does not escalate to PLATFORM", async () => {
		// Agency-only grant + missing header must NOT suspend as if PLATFORM.
		const { app } = harness({
			principals: [alicePrincipal, bobPrincipal],
			capabilities: ["identity.admin"],
			grantScopeId: agencyA,
			memberships: [agencyA],
			targetAgencyIds: [agencyB],
		});

		const response = await app.handle(
			request(`/v1/identity/principals/${bobPrincipal.id}/suspend`, {
				method: "POST",
				headers: {
					"idempotency-key": randomUUID(),
				},
				body: { reasonCode: "ops.manual" },
			}),
		);

		expect(response.status).toBe(403);
		expect((await response.json()).error.details.code).toBe("IDN_FORBIDDEN");
	});
});
