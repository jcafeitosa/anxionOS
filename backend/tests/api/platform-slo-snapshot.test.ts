import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import type { Principal } from "@anxionos/identity";
import { createMetricsCollector } from "@anxionos/observability";
import { Elysia } from "elysia";
import { createPlatformSloSnapshotPlugin } from "../../apps/api/src/operations/platform-slo-snapshot-plugin";
import { createInMemoryGrantRepository } from "../governance/test-support";
import { createInMemoryPrincipalRepository } from "../identity/test-support";

describe("GET /v1/operations/platform/slo-snapshot", () => {
	test("returns schema-valid redacted snapshot", async () => {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", { prefix: "/health" });
		metrics.recordHistogram("api.latency", 12, { prefix: "/health" });

		const authUserId = "auth-user-platform";
		const principalId = "22222222-2222-4222-8222-222222222222";

		const testPrincipal: Principal = {
			id: principalId,
			authUserId,
			email: "platform-slo@test.anxion.os",
			kind: "human",
			status: "active",
			revision: 1,
			createdAt: new Date(),
			suspendedAt: null,
			suspensionReason: null,
			revokedAt: null,
			revocationReason: null,
		};

		const grantRepository = createInMemoryGrantRepository([
			{
				id: randomUUID(),
				tenantId: PLATFORM_SCOPE_ID,
				agencyId: PLATFORM_SCOPE_ID,
				scopeId: PLATFORM_SCOPE_ID,
				scopeKind: "platform",
				granteePrincipalId: principalId,
				granteeAgentId: null,
				issuedByPrincipalId: null,
				capability: "console.platform",
				resourceRef: null,
				status: "active",
				validFrom: new Date(),
				validUntil: null,
				derivedFromMembershipId: null,
				authorityEpochAtIssue: 1,
				revision: 1,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		]);

		const identityRepository = createInMemoryPrincipalRepository([
			testPrincipal,
		]);

		// Mock Better Auth with valid session
		const auth = {
			api: {
				getSession: async () => ({
					user: { id: authUserId },
					session: { token: "mock-token" },
				}),
			},
		} as any;

		const app = new Elysia().use(
			createPlatformSloSnapshotPlugin({
				metrics,
				grantRepository,
				auth,
				identityRepository,
				now: () => "2026-09-11T12:00:00.000Z",
			}),
		);

		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot"),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(platformSloSnapshotSchema.safeParse(body).success).toBe(true);
		expect(body.scope).toBe("platform");
		expect(body.api.totalRequests).toBe(1);
		expect(body.generatedAt).toBe("2026-09-11T12:00:00.000Z");
	});
});
