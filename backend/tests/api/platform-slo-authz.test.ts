import { randomUUID } from "node:crypto";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { createMetricsCollector } from "@anxionos/observability";
import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { createPlatformSloSnapshotPlugin } from "../../apps/api/src/operations/platform-slo-snapshot-plugin";
import {
	createInMemoryGrantRepository,
	createStubPrincipalLookup,
} from "../governance/test-support";

/**
 * ANX-497 — SLO snapshot authz tests.
 *
 * Before: GET /v1/operations/platform/slo-snapshot had zero authorization.
 * After: Requires console.platform grant with PLATFORM scope.
 *
 * Abuse cases:
 * 1. No session → error
 * 2. Valid session but no grant → error
 * 3. Valid session + console.platform grant in PLATFORM scope → 200
 */
describe("ANX-497 — platform SLO snapshot authorization", () => {
	function createApp(principalId?: string, hasGrant = false) {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", { prefix: "/health" });

		const grantRepository = createInMemoryGrantRepository(
			hasGrant && principalId
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

		return new Elysia().use(
			createPlatformSloSnapshotPlugin({
				metrics,
				grantRepository,
				now: () => "2026-09-11T12:00:00.000Z",
			}),
		);
	}

	test("ABUSE CASE 1 — no session → error", async () => {
		const app = createApp();
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot"),
		);
		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	test("ABUSE CASE 2 — valid session but no grant → error", async () => {
		const principalId = randomUUID();
		const app = createApp(principalId, false);
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot", {
				headers: {
					"x-principal-id": principalId,
				},
			}),
		);
		expect(response.status).toBeGreaterThanOrEqual(400);
	});

	test("VALID CASE — console.platform in PLATFORM scope → 200", async () => {
		const principalId = randomUUID();
		const app = createApp(principalId, true);
		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot", {
				headers: {
					"x-principal-id": principalId,
				},
			}),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(body).toHaveProperty("api");
		expect(body).toHaveProperty("eventing");
		expect(body.scope).toBe("platform");
	});
});
