import { describe, expect, test } from "bun:test";
import { PLATFORM_CONSOLE_CAPABILITY } from "@anxionos/contracts/governance";
import type { Grant } from "@anxionos/governance";
import {
	handleGetPlatformHealth,
	handleListPlatformIncidents,
	handleListPlatformRecovery,
	handleListPlatformRuntimes,
	requirePlatformConsoleGrant,
} from "../../apps/api/src/operations/handlers/platform-queries";
import { createInMemoryGrantRepository } from "../governance/test-support";

const principalId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-09-11T16:00:00.000Z");

function platformGrant(): Grant {
	return {
		id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
		tenantId: principalId,
		agencyId: principalId,
		scopeId: principalId,
		scopeKind: "agency",
		granteePrincipalId: principalId,
		granteeAgentId: null,
		capability: PLATFORM_CONSOLE_CAPABILITY,
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: null,
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 1,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

describe("platform operations queries (ANX-166)", () => {
	test("requirePlatformConsoleGrant forbids missing grant", async () => {
		const grantRepository = createInMemoryGrantRepository();
		await expect(
			requirePlatformConsoleGrant(grantRepository, principalId, now),
		).rejects.toMatchObject({ statusCode: 403 });
	});

	test("requirePlatformConsoleGrant allows console.platform", async () => {
		const grantRepository = createInMemoryGrantRepository([platformGrant()]);
		await expect(
			requirePlatformConsoleGrant(grantRepository, principalId, now),
		).resolves.toBeUndefined();
	});

	test("handleListPlatformIncidents never returns agency rows", () => {
		expect(handleListPlatformIncidents()).toEqual({ incidents: [] });
	});

	test("handleListPlatformRuntimes is an empty PLATFORM ledger", () => {
		expect(handleListPlatformRuntimes()).toEqual({ runtimes: [] });
	});

	test("handleListPlatformRecovery does not list agency recovery tasks", () => {
		expect(handleListPlatformRecovery()).toEqual({ recoveryTasks: [] });
	});

	test("handleGetPlatformHealth records source and checkedAt", async () => {
		const snapshot = await handleGetPlatformHealth(async () => ({
			postgres: "ok",
			nats: "error",
			neo4j: "ok",
		}));
		expect(snapshot.source).toBe("probeHealthDeps");
		expect(snapshot.stale).toBe(true);
		expect(snapshot.deps.nats).toBe("error");
		expect(snapshot.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
	});
});
