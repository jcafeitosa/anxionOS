import { describe, expect, test } from "bun:test";
import {
	assertCapabilityOutcomeKnown,
	CAPABILITY_MANIFEST_V1_CATALOG,
	CAPABILITY_MANIFEST_V1_ENTRIES,
	CapabilityManifestError,
	capabilityManifestCatalogSchema,
	createCapabilityManifestClient,
	getCapabilityManifestEntry,
	pageRequestSchema,
	pageResponseSchema,
	parseCapabilityManifestCatalog,
	validateCapabilityInput,
} from "@anxionos/contracts/capability-manifest";

describe("capability manifest catalog v1", () => {
	test("catalog parses and contains P02 foundation entries", () => {
		const parsed = parseCapabilityManifestCatalog(
			CAPABILITY_MANIFEST_V1_CATALOG,
		);
		expect(parsed.catalogVersion).toBe(1);
		expect(parsed.entries.length).toBe(CAPABILITY_MANIFEST_V1_ENTRIES.length);
		expect(parsed.entries.length).toBeGreaterThanOrEqual(14);
	});

	test("every entry exposes owner, grants, modes, effect, idempotency, approval and surfaces", () => {
		for (const entry of CAPABILITY_MANIFEST_V1_ENTRIES) {
			expect(entry.capabilityId).toMatch(
				/^[a-z][a-z0-9-]*(\.[a-z][a-zA-Z0-9-]*){1,2}$/,
			);
			expect(entry.version).toBe(1);
			expect(entry.ownerModule).toBeTruthy();
			expect(entry.requiredGrants).toBeInstanceOf(Array);
			expect(entry.allowedChannels.length).toBeGreaterThan(0);
			expect(entry.allowedExecutionModes).toEqual(["SIMULATED"]);
			expect(entry.effectClass).toBeTruthy();
			expect(entry.idempotencyPolicy.key).toBeTruthy();
			expect(entry.approvalPolicy.kind).toBeTruthy();
			expect(entry.auditPolicy.requiresCorrelationId).toBe(true);
			expect(entry.surfaces.api.startsWith("/v1/")).toBe(true);
		}
	});

	test("catalog schema rejects malformed capability id", () => {
		expect(() =>
			capabilityManifestCatalogSchema.parse({
				catalogVersion: 1,
				entries: [
					{
						...CAPABILITY_MANIFEST_V1_ENTRIES[0],
						capabilityId: "invalid",
					},
				],
			}),
		).toThrow();
	});
});

describe("capability manifest registry", () => {
	test("validates organizations.agency.create input", () => {
		const parsed = validateCapabilityInput("organizations.agency.create", {
			commandId: "550e8400-e29b-41d4-a716-446655440000",
			displayName: "Acme Capital",
			marketScope: "both",
		});
		expect(parsed).toMatchObject({ displayName: "Acme Capital" });
	});

	test("rejects unknown capability", () => {
		expect(() =>
			getCapabilityManifestEntry("unknown.capability.missing"),
		).toThrow(CapabilityManifestError);
	});

	test("deferred input schema fails explicitly", () => {
		// `identity.principal.get` is a read with no request body, so its input
		// contract is intentionally absent and must fail closed.
		expect(() => validateCapabilityInput("identity.principal.get", {})).toThrow(
			CapabilityManifestError,
		);
		try {
			validateCapabilityInput("identity.principal.get", {});
		} catch (error) {
			expect(error).toBeInstanceOf(CapabilityManifestError);
			expect((error as CapabilityManifestError).code).toBe(
				"CAP_MANIFEST_INPUT_SCHEMA_UNAVAILABLE",
			);
		}
	});

	test("identity.session.revoke now validates its declared input schema", () => {
		const parsed = validateCapabilityInput("identity.session.revoke", {
			principalId: "11111111-1111-4111-8111-111111111111",
			sessionRefId: "22222222-2222-4222-8222-222222222222",
		});
		expect(parsed).toMatchObject({
			sessionRefId: "22222222-2222-4222-8222-222222222222",
		});
	});

	test("UNKNOWN outcome is not treated as success", () => {
		expect(() =>
			assertCapabilityOutcomeKnown("UNKNOWN", {
				capabilityId: "authorization.can",
			}),
		).toThrow(CapabilityManifestError);
		expect(() => assertCapabilityOutcomeKnown("RECONCILING")).toThrow(
			CapabilityManifestError,
		);
		expect(() => assertCapabilityOutcomeKnown("CONFIRMED")).not.toThrow();
	});
});

describe("capability manifest client", () => {
	test("typed client enforces channel and mode", () => {
		const client = createCapabilityManifestClient();
		const entry = client.assertInvocationAllowed(
			"organizations.agency.create",
			{
				channel: "sdk",
				executionMode: "SIMULATED",
			},
		);
		expect(entry.capabilityId).toBe("organizations.agency.create");
		expect(client.surfaces("authorization.can").tool).toBe("authorization.can");
		expect(() =>
			client.assertInvocationAllowed("organizations.membership.acceptInvite", {
				channel: "sdk",
				executionMode: "SIMULATED",
			}),
		).toThrow(CapabilityManifestError);
	});
});

describe("capability manifest pagination", () => {
	test("page request/response schemas validate boundaries", () => {
		const request = pageRequestSchema.parse({
			pageSize: 25,
			pageToken: "cursor-1",
		});
		expect(request.pageSize).toBe(25);
		const response = pageResponseSchema.parse({
			items: [{ capabilityId: "authorization.can" }],
			nextPageToken: "cursor-2",
			totalCount: 14,
		});
		expect(response.items).toHaveLength(1);
	});
});
