import { randomUUID } from "node:crypto";
import { PLATFORM_SCOPE_ID } from "@anxionos/contracts/governance";
import { describe, expect, test } from "bun:test";
import { registerPrincipalForTest } from "../identity/helpers";
import { issueGrantForTest } from "../organizations/helpers";
import type { TestApiFixture } from "./fixture";
import { withApiFixture } from "./fixture";

/**
 * ANX-497 — SLO snapshot authz tests.
 *
 * Before: GET /v1/operations/platform/slo-snapshot had zero authorization.
 * After: Requires console.platform grant with PLATFORM scope.
 *
 * Abuse cases:
 * 1. No session → 401/403
 * 2. Valid session but no grant → 401/403
 * 3. Valid session + console.platform grant in AGENCY scope → 401/403
 * 4. Valid session + console.platform grant in PLATFORM scope → 200
 */
describe("ANX-497 — platform SLO snapshot authorization", () => {
	async function makeRequest(
		api: TestApiFixture,
		headers: Record<string, string> = {},
	) {
		return api.app.handle(
			new Request("http://127.0.0.1/v1/operations/platform/slo-snapshot", {
				method: "GET",
				headers,
			}),
		);
	}

	test("ABUSE CASE 1 — no session → 401/403 (unauthorized)", async () =>
		withApiFixture(async (api) => {
			const response = await makeRequest(api);
			expect(response.status).toBeGreaterThanOrEqual(401);
			expect(response.status).toBeLessThanOrEqual(403);
		}));

	test("ABUSE CASE 2 — valid session but no grant → 401/403 (forbidden)", async () =>
		withApiFixture(async (api) => {
			const principal = await registerPrincipalForTest(api.pool, {
				authUserId: randomUUID(),
				email: "no-grant@test.anxion.os",
			});
			const response = await makeRequest(api, {
				"x-principal-id": principal.id,
			});
			expect(response.status).toBeGreaterThanOrEqual(401);
			expect(response.status).toBeLessThanOrEqual(403);
		}));

	test("ABUSE CASE 3 — console.platform in AGENCY scope → 401/403 (scope mismatch)", async () =>
		withApiFixture(async (api) => {
			const agencyId = randomUUID();
			const principal = await registerPrincipalForTest(api.pool, {
				authUserId: randomUUID(),
				email: "agency-scoped@test.anxion.os",
			});
			// Attempt to grant console.platform in agency scope
			// This should fail at grant issuance, but test the authz path
			await expect(
				issueGrantForTest(api.pool, {
					scopeId: agencyId,
					granteePrincipalId: principal.id,
					capability: "console.platform",
				}),
			).rejects.toThrow(); // GOV_CAPABILITY_SCOPE_MISMATCH

			const response = await makeRequest(api, {
				"x-principal-id": principal.id,
			});
			expect(response.status).toBeGreaterThanOrEqual(401);
			expect(response.status).toBeLessThanOrEqual(403);
		}));

	test("VALID CASE — console.platform in PLATFORM scope → 200", async () =>
		withApiFixture(async (api) => {
			const principal = await registerPrincipalForTest(api.pool, {
				authUserId: randomUUID(),
				email: "platform-console@test.anxion.os",
			});
			await issueGrantForTest(api.pool, {
				scopeId: PLATFORM_SCOPE_ID,
				granteePrincipalId: principal.id,
				capability: "console.platform",
			});
			const response = await makeRequest(api, {
				"x-principal-id": principal.id,
			});
			expect(response.status).toBe(200);
			const body = await response.json();
			expect(body).toHaveProperty("api");
			expect(body).toHaveProperty("eventing");
		}));
});
