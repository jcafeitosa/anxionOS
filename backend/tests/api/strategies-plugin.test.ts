import { describe, expect, test } from "bun:test";
import { STRATEGIES_ERROR_CODES } from "@anxionos/contracts/strategies";
import { StrategiesCommandError } from "@anxionos/strategies";
import { assertActorCanMutate } from "@anxionos/organizations";
import { registerStrategyCommandSchema } from "@anxionos/contracts/strategies";
import { mapStrategiesError } from "../../apps/api/src/strategies/error-handler";
import {
	backtestRunIdParamSchema,
	deploymentIdParamSchema,
	strategyIdParamSchema,
	strategyVersionIdParamSchema,
} from "../../apps/api/src/strategies/handlers/commands";
import { createInMemoryMembershipRepository } from "../organizations/test-support";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function activeMembership(
	role: Membership["role"],
	principalId: string,
): Membership {
	const now = new Date("2026-09-11T00:00:00.000Z");
	return {
		id: `${role}-${principalId}`,
		agencyId,
		principalId,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status: "active",
		invitedAt: null,
		joinedAt: now,
		revokedAt: null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

describe("strategies POST RBAC (ANX-442)", () => {
	test("viewer membership is rejected with 403 via assertActorCanMutate", async () => {
		const viewerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const repo = createInMemoryMembershipRepository([
			activeMembership("viewer", viewerId),
		]);
		await expect(
			assertActorCanMutate(repo, viewerId, agencyId),
		).rejects.toMatchObject({
			organizationCode: "ORG_CROSS_TENANT",
			statusCode: 403,
		});
		const mapped = mapStrategiesError(
			await assertActorCanMutate(repo, viewerId, agencyId).catch((error) => error),
		);
		expect(mapped.status).toBe(403);
	});

	test("operator membership passes mutation guard", async () => {
		const operatorId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const repo = createInMemoryMembershipRepository([
			activeMembership("operator", operatorId),
		]);
		const membership = await assertActorCanMutate(repo, operatorId, agencyId);
		expect(membership.role).toBe("operator");
	});

	test.each([
		["owner", "dddddddd-dddd-4ddd-8ddd-dddddddddd01"],
		["admin", "dddddddd-dddd-4ddd-8ddd-dddddddddd02"],
		["operator", "dddddddd-dddd-4ddd-8ddd-dddddddddd03"],
	] as const)("%s membership passes mutation guard", async (role, principalId) => {
		const repo = createInMemoryMembershipRepository([
			activeMembership(role, principalId),
		]);
		const membership = await assertActorCanMutate(repo, principalId, agencyId);
		expect(membership.role).toBe(role);
	});
});

describe("strategies API boundary", () => {
	test("deploymentIdParamSchema accepts st_dep_ ids", () => {
		const parsed = deploymentIdParamSchema.parse({
			deploymentId: "st_dep_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
		});
		expect(parsed.deploymentId).toMatch(/^st_dep_/);
	});
	test("registerStrategy body schema strips organizationId tampering", () => {
		const parsed = registerStrategyCommandSchema
			.omit({ commandId: true, organizationId: true })
			.strict()
			.safeParse({
				displayName: "Momentum",
				executionMode: "SIMULATED",
				organizationId: "00000000-0000-4000-8000-000000000099",
			});
		expect(parsed.success).toBe(false);
	});

	test("mapStrategiesError maps ST_STRATEGY_NOT_FOUND to 404", () => {
		const error = new StrategiesCommandError(
			STRATEGIES_ERROR_CODES.STRATEGY_NOT_FOUND,
			"strategy not found",
		);
		const mapped = mapStrategiesError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: STRATEGIES_ERROR_CODES.STRATEGY_NOT_FOUND,
		});
	});

	test("mapStrategiesError maps ST_SCOPE_DENIED to 403", () => {
		const error = new StrategiesCommandError(
			STRATEGIES_ERROR_CODES.SCOPE_DENIED,
			"scope denied",
		);
		const mapped = mapStrategiesError(error);
		expect(mapped.status).toBe(403);
	});


	test("mapStrategiesError maps ST_CROSS_TENANT to 403", () => {
		const error = new StrategiesCommandError(
			STRATEGIES_ERROR_CODES.CROSS_TENANT,
			"command journal organization mismatch",
		);
		const mapped = mapStrategiesError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({
			code: STRATEGIES_ERROR_CODES.CROSS_TENANT,
		});
	});

	test("mapStrategiesError maps ST_EXECUTION_MODE_NOT_SUPPORTED to 422", () => {
		const error = new StrategiesCommandError(
			STRATEGIES_ERROR_CODES.EXECUTION_MODE_NOT_SUPPORTED,
			"mode not supported",
		);
		const mapped = mapStrategiesError(error);
		expect(mapped.status).toBe(422);
	});

	test("path param schemas reject tampered ids", () => {
		expect(strategyIdParamSchema.safeParse({ strategyId: "bad" }).success).toBe(
			false,
		);
		expect(
			strategyVersionIdParamSchema.safeParse({ strategyVersionId: "bad" }).success,
		).toBe(false);
		expect(
			backtestRunIdParamSchema.safeParse({ backtestRunId: "bad" }).success,
		).toBe(false);
	});
});
