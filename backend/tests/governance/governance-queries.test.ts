import { describe, expect, test } from "bun:test";
import {
	PLATFORM_CONSOLE_CAPABILITY,
	PLATFORM_SCOPE_ID,
} from "@anxionos/contracts/governance";
import {
	type Grant,
	getAuthorityEpoch,
	hasCapability,
	hasPlatformConsoleGrant,
	listEffectiveGrants,
} from "@anxionos/governance";
import {
	createInMemoryAuthorityEpochStore,
	createInMemoryGrantRepository,
} from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const principalId = "11111111-1111-4111-8111-111111111111";

function seedGrant(overrides: Partial<Grant> = {}): Grant {
	const now = new Date("2026-09-10T12:00:00.000Z");
	return {
		id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		tenantId: scopeId,
		agencyId: scopeId,
		scopeId,
		scopeKind: "agency",
		granteePrincipalId: principalId,
		granteeAgentId: null,
		capability: "owner.read",
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: new Date("2027-09-10T12:00:00.000Z"),
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
		...overrides,
	};
}

describe("listEffectiveGrants", () => {
	test("returns active non-expired grants for principal", async () => {
		const grantRepository = createInMemoryGrantRepository([seedGrant()]);
		const grants = await listEffectiveGrants(
			{ grantRepository },
			{ scopeId, principalId },
		);
		expect(grants).toHaveLength(1);
	});

	test("excludes expired grants at asOf", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({
				validUntil: new Date("2026-09-01T00:00:00.000Z"),
			}),
		]);
		const grants = await listEffectiveGrants(
			{ grantRepository },
			{
				scopeId,
				principalId,
				asOf: new Date("2026-09-10T12:00:00.000Z"),
			},
		);
		expect(grants).toHaveLength(0);
	});
});

describe("hasPlatformConsoleGrant", () => {
	test("is false without console.platform capability", async () => {
		const grantRepository = createInMemoryGrantRepository([seedGrant()]);
		await expect(
			hasPlatformConsoleGrant({ grantRepository }, principalId),
		).resolves.toBe(false);
	});

	test("is true with a PLATFORM-scoped console.platform grant", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({
				capability: PLATFORM_CONSOLE_CAPABILITY,
				scopeId: PLATFORM_SCOPE_ID,
				scopeKind: "platform",
			}),
		]);
		await expect(
			hasPlatformConsoleGrant({ grantRepository }, principalId),
		).resolves.toBe(true);
	});

	/**
	 * ANX-462: era exatamente o fixture anterior (grant agency-scoped de
	 * `console.platform`) — a suite AFIRMAVA a escalacao. Um operador de agencia
	 * emitia a capability no proprio escopo e abria o console de plataforma.
	 */
	test("is false with an AGENCY-scoped console.platform grant", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({ capability: PLATFORM_CONSOLE_CAPABILITY }),
		]);
		await expect(
			hasPlatformConsoleGrant({ grantRepository }, principalId),
		).resolves.toBe(false);
	});
});

describe("hasCapability", () => {
	const asOf = new Date("2026-09-10T12:00:00.000Z");

	test("matches the requested capability only", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({ capability: "identity.admin" }),
		]);
		await expect(
			hasCapability(
				{ grantRepository },
				{ principalId, capability: "identity.admin", asOf },
			),
		).resolves.toBe(true);
		await expect(
			hasCapability(
				{ grantRepository },
				{ principalId, capability: "identity.read", asOf },
			),
		).resolves.toBe(false);
	});

	test("fails closed when the grant is outside its validity window", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({
				capability: "identity.admin",
				validFrom: new Date("2026-09-01T00:00:00.000Z"),
				validUntil: new Date("2026-09-05T00:00:00.000Z"),
			}),
		]);
		await expect(
			hasCapability(
				{ grantRepository },
				{ principalId, capability: "identity.admin", asOf },
			),
		).resolves.toBe(false);
	});

	test("honours the optional scope filter", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({ capability: "identity.read", scopeId }),
		]);
		await expect(
			hasCapability(
				{ grantRepository },
				{ principalId, capability: "identity.read", asOf, scopeId },
			),
		).resolves.toBe(true);
		await expect(
			hasCapability(
				{ grantRepository },
				{
					principalId,
					capability: "identity.read",
					asOf,
					scopeId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
				},
			),
		).resolves.toBe(false);
	});

	test("is false for a principal without grants", async () => {
		const grantRepository = createInMemoryGrantRepository([]);
		await expect(
			hasCapability(
				{ grantRepository },
				{ principalId, capability: "identity.read", asOf },
			),
		).resolves.toBe(false);
	});

	/**
	 * Bypass corrigido no G2: `undefined` significava "qualquer escopo", entao um
	 * grant de agencia autorizava operacao global quando o header era omitido.
	 * A autoridade global agora e' o escopo PLATAFORMA (ANX-462), nao escopo nulo.
	 */
	test("platform scope id rejects an agency-scoped grant", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({ capability: "identity.admin", scopeId }),
		]);
		await expect(
			hasCapability(
				{ grantRepository },
				{
					principalId,
					capability: "identity.admin",
					asOf,
					scopeId: PLATFORM_SCOPE_ID,
				},
			),
		).resolves.toBe(false);
	});

	test("platform scope id accepts a platform-scoped grant", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({
				capability: "identity.admin",
				scopeId: PLATFORM_SCOPE_ID,
				scopeKind: "platform",
			}),
		]);
		await expect(
			hasCapability(
				{ grantRepository },
				{
					principalId,
					capability: "identity.admin",
					asOf,
					scopeId: PLATFORM_SCOPE_ID,
				},
			),
		).resolves.toBe(true);
	});

	test("omitted scope keeps any-scope behaviour for scope-agnostic tokens", async () => {
		const grantRepository = createInMemoryGrantRepository([
			seedGrant({ capability: PLATFORM_CONSOLE_CAPABILITY, scopeId }),
		]);
		await expect(
			hasCapability(
				{ grantRepository },
				{ principalId, capability: PLATFORM_CONSOLE_CAPABILITY, asOf },
			),
		).resolves.toBe(true);
	});
});

describe("getAuthorityEpoch", () => {
	test("returns epoch record for scope", async () => {
		const authorityEpochStore = createInMemoryAuthorityEpochStore([
			{
				scopeId,
				tenantId: scopeId,
				agencyId: scopeId,
				epoch: 7,
				updatedAt: new Date(),
			},
		]);
		const record = await getAuthorityEpoch({ authorityEpochStore }, scopeId);
		expect(record.epoch).toBe(7);
	});
});
