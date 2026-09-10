import { describe, expect, test } from "bun:test";
import { ORGANIZATION_EVENT_TYPES } from "@anxionos/contracts/organizations";
import {
	buildAgencyBootstrapContext,
	resolveAgencyGraphScope,
	resolveAgencyNatsSubjectPrefix,
	resolveAgencyTenantContext,
	runAgencyScopedRead,
} from "../../apps/api/src/middleware/resolve-tenant-context";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("resolveAgencyTenantContext (ANX-259)", () => {
	test("maps agency boundary 1:1 to tenantId for RLS", () => {
		const ctx = resolveAgencyTenantContext(agencyId, principalId);
		expect(ctx.tenantId).toBe(agencyId);
		expect(ctx.agencyId).toBe(agencyId);
		expect(ctx.principalId).toBe(principalId);
	});
});

describe("resolveAgencyNatsSubjectPrefix (ANX-259)", () => {
	test("prefixes JetStream subjects under agency namespace", () => {
		expect(resolveAgencyNatsSubjectPrefix(agencyId)).toBe(
			`agency.${agencyId}.events.`,
		);
	});
});

describe("resolveAgencyGraphScope (ANX-259)", () => {
	test("maps agency boundary to AGENCY acting scope", () => {
		expect(resolveAgencyGraphScope(agencyId, principalId)).toEqual({
			principalId,
			actingScope: { scopeType: "AGENCY", scopeId: agencyId },
		});
	});
});

describe("buildAgencyBootstrapContext (ANX-259)", () => {
	test("unifies RLS tenant, NATS prefix and graph scope", () => {
		const bootstrap = buildAgencyBootstrapContext(agencyId, principalId);
		expect(bootstrap.tenant.tenantId).toBe(agencyId);
		expect(bootstrap.natsSubjectPrefix).toBe(`agency.${agencyId}.events.`);
		expect(bootstrap.graphScope.actingScope.scopeId).toBe(agencyId);
		expect(
			bootstrap.resolveEventSubject(
				ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED,
			),
		).toBe(
			`agency.${agencyId}.events.${ORGANIZATION_EVENT_TYPES.MEMBERSHIP_ACTIVATED}`,
		);
	});
});

describe("runAgencyScopedRead (ANX-259)", () => {
	test("invokes withContext with agency tenant and passes scoped repos", async () => {
		let capturedCtx: unknown;
		const scopedPool = {
			withContext: async (
				ctx: unknown,
				work: (client: object) => Promise<unknown>,
			) => {
				capturedCtx = ctx;
				return work({});
			},
		};
		const result = await runAgencyScopedRead(
			scopedPool,
			agencyId,
			principalId,
			async (repos) => {
				expect(repos.agencyRepository).toBeDefined();
				expect(repos.membershipRepository).toBeDefined();
				return "ok";
			},
		);
		expect(result).toBe("ok");
		expect(capturedCtx).toEqual({
			tenantId: agencyId,
			agencyId,
			principalId,
		});
	});
});
