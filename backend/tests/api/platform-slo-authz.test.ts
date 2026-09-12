import { randomUUID } from "node:crypto";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import type { Principal } from "@anxionos/identity";
import { createMetricsCollector } from "@anxionos/observability";
import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { createPlatformSloSnapshotPlugin } from "../../apps/api/src/operations/platform-slo-snapshot-plugin";
import { createInMemoryGrantRepository } from "../governance/test-support";
import { createInMemoryPrincipalRepository } from "../identity/test-support";

/**
 * ANX-497 — SLO snapshot authz tests.
 *
 * Maya criterion 1 (residual): x-principal-id header alone is spoofable.
 * Required: real session (Better Auth getSession) + console.platform grant.
 *
 * Abuse cases:
 * 1. No session → 401 unauthenticated
 * 2. Spoofed x-principal-id without valid session → 401 (not 200/403-as-if-authenticated)
 * 3. Valid session but no grant → 403 forbidden
 * 4. Valid session + console.platform grant in PLATFORM scope → 200
 */
describe("ANX-497 — platform SLO snapshot authorization", () => {
	const authUserId = "auth-user-123";
	const principalId = "11111111-1111-4111-8111-111111111111";

	const testPrincipal: Principal = {
		id: principalId,
		authUserId,
		email: "platform-admin@test.anxion.os",
		kind: "human",
		status: "active",
		revision: 1,
		createdAt: new Date(),
		suspendedAt: null,
		suspensionReason: null,
		revokedAt: null,
		revocationReason: null,
	};

	function createApp(hasSession: boolean, hasGrant: boolean) {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", { prefix: "/health" });

		const grantRepository = createInMemoryGrantRepository(
			hasGrant
				? [
						{
							id: randomUUID(),
							tenantId: PLATFORM_SCOPE_ID,
							agencyId: PLATFORM_SCOPE_ID,
							scopeId: PLATFORM_SCOPE_ID,
							scopeKind: "platform" as const,
							granteePrincipalId: principalId,
							granteeAgentId: null,
							issuedByPrincipalId: null,
							capability: "console.platform",
							resourceRef: null,
							status: "active" as const,
							validFrom: new Date(),
							validUntil: null,
							derivedFromMembershipId: null,
							authorityEpochAtIssue: 1,
							revision: 1,
							createdAt: new Date(),
							updatedAt: new Date(),
						},
					]
				: [],
		);

		const identityRepository = createInMemoryPrincipalRepository([
			testPrincipal,
		]);

		// Mock Better Auth
		const auth = {
			api: {
				getSession: async () => {
					if (!hasSession) return null;
					return {
						user: { id: authUserId },
						session: { token: "mock-token" },
					};
				},
			},
		} as any;

		return new Elysia().use(
			createPlatformSloSnapshotPlugin({
				metrics,
				grantRepository,
				auth,
				identityRepository,
				now: () => "2026-09-11T12:00:00.000Z",
			}),
		);
	}

	test("ABUSE CASE 1 — no session → 401 unauthenticated", async () => {
		const app = createApp(false, false);
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot"),
		);
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBeDefined();
	});

	test("ABUSE CASE 2 — spoofed x-principal-id without session → 401", async () => {
		const app = createApp(false, false);
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot", {
				headers: {
					"x-principal-id": principalId, // Spoofed header
				},
			}),
		);
		// Must be 401 (not 200/403-as-if-authenticated)
		expect(response.status).toBe(401);
		const body = await response.json();
		expect(body.error).toBeDefined();
	});

	test("ABUSE CASE 3 — valid session but no grant → 403 forbidden", async () => {
		const app = createApp(true, false);
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot"),
		);
		expect(response.status).toBe(403);
		const body = await response.json();
		expect(body.error).toBeDefined();
	});

	test("VALID CASE — valid session + console.platform grant → 200", async () => {
		const app = createApp(true, true);
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot"),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty("api");
		expect(body).toHaveProperty("eventing");
		expect(body.scope).toBe("platform");
	});
});
