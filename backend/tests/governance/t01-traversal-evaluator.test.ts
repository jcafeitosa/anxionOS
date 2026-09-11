import { describe, expect, test } from "bun:test";
import {
	createGraphT01TraversalEvaluator,
	GOVERNANCE_T01_DENY_REASONS,
	GOVERNANCE_T01_TIMEOUT_MS,
} from "@anxionos/governance";
import { createInMemoryAuthorityEpochStore } from "./test-support";

const scopeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const actorId = "11111111-1111-4111-8111-111111111111";

const baseInput = {
	scope: {
		tenantId: scopeId,
		agencyId: scopeId,
		principalId: actorId,
	},
	params: {
		actorId,
		action: "trade.execute",
		resourceNodeKey: { domain: "capital", kind: "account", id: scopeId },
		validAt: new Date().toISOString(),
	},
	authorityScopeId: scopeId,
};

describe("graph T01 traversal evaluator (G3-GOV-05)", () => {
	test("returns DENY on timeout", async () => {
		const evaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore([
				{
					scopeId,
					tenantId: scopeId,
					agencyId: scopeId,
					epoch: 2,
					updatedAt: new Date(),
				},
			]),
			graphEvaluator: {
				async evaluate() {
					await new Promise((resolve) => setTimeout(resolve, 50));
					return {
						data: { decision: "ALLOW", authorityEpoch: 2 },
						authorityEpoch: 2,
						riskEpoch: 0,
						projectionGeneration: 1,
						checkpoint: "cp-1",
					};
				},
			},
			timeoutMs: 1,
		});
		const result = await evaluator.evaluateT01(baseInput);
		expect(result.decision).toBe("DENY");
		expect(result.denyReasons).toContain(GOVERNANCE_T01_DENY_REASONS.TIMEOUT);
	});

	test("returns DENY when expected authority epoch is stale", async () => {
		const evaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore([
				{
					scopeId,
					tenantId: scopeId,
					agencyId: scopeId,
					epoch: 5,
					updatedAt: new Date(),
				},
			]),
			graphEvaluator: {
				async evaluate() {
					return {
						data: { decision: "ALLOW", authorityEpoch: 5 },
						authorityEpoch: 5,
						riskEpoch: 0,
						projectionGeneration: 1,
						checkpoint: "cp-1",
					};
				},
			},
		});
		const result = await evaluator.evaluateT01({
			...baseInput,
			params: { ...baseInput.params, expectedAuthorityEpoch: 3 },
		});
		expect(result.decision).toBe("DENY");
		expect(result.denyReasons).toContain(
			GOVERNANCE_T01_DENY_REASONS.STALE_AUTHORITY_EPOCH,
		);
	});

	test("returns DENY when graph kernel is unavailable", async () => {
		const evaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore(),
			graphEvaluator: {
				async evaluate() {
					throw new Error("neo4j down");
				},
			},
		});
		const result = await evaluator.evaluateT01(baseInput);
		expect(result.decision).toBe("DENY");
		expect(result.denyReasons).toContain(
			GOVERNANCE_T01_DENY_REASONS.GRAPH_UNAVAILABLE,
		);
	});

	test("delegates to graph kernel on success", async () => {
		const evaluator = createGraphT01TraversalEvaluator({
			authorityEpochStore: createInMemoryAuthorityEpochStore([
				{
					scopeId,
					tenantId: scopeId,
					agencyId: scopeId,
					epoch: 1,
					updatedAt: new Date(),
				},
			]),
			graphEvaluator: {
				async evaluate() {
					return {
						data: {
							decision: "ALLOW",
							authorityEpoch: 1,
							proof: { grantIds: [] },
						},
						authorityEpoch: 1,
						riskEpoch: 0,
						projectionGeneration: 1,
						checkpoint: "cp-1",
					};
				},
			},
		});
		const result = await evaluator.evaluateT01(baseInput);
		expect(result.decision).toBe("ALLOW");
	});

	test("default timeout is 2s", () => {
		expect(GOVERNANCE_T01_TIMEOUT_MS).toBe(2000);
	});
});
