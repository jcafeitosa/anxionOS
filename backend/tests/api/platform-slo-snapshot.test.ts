import { randomUUID } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { platformSloSnapshotSchema } from "@anxionos/contracts/operations";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { createMetricsCollector } from "@anxionos/observability";
import { Elysia } from "elysia";
import { createPlatformSloSnapshotPlugin } from "../../apps/api/src/operations/platform-slo-snapshot-plugin";
import { createInMemoryGrantRepository } from "../governance/test-support";

describe("GET /v1/operations/platform/slo-snapshot", () => {
	test("returns schema-valid redacted snapshot", async () => {
		const metrics = createMetricsCollector();
		metrics.incrementCounter("api.requests", { prefix: "/health" });
		metrics.recordHistogram("api.latency", 12, { prefix: "/health" });

		const principalId = randomUUID();
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

		const app = new Elysia().use(
			createPlatformSloSnapshotPlugin({
				metrics,
				grantRepository,
				now: () => "2026-09-11T12:00:00.000Z",
			}),
		);

		const response = await app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot", {
				headers: {
					"x-principal-id": principalId,
				},
			}),
		);
		expect(response.status).toBe(200);
		const body = await response.json();
		expect(platformSloSnapshotSchema.safeParse(body).success).toBe(true);
		expect(body.scope).toBe("platform");
		expect(body.api.totalRequests).toBe(1);
		expect(body.generatedAt).toBe("2026-09-11T12:00:00.000Z");
	});
});
