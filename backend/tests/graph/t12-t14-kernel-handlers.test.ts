/**
 * ANX-303 - Graph S3: T12 outcome attribution + T14 connection revoke impact.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { GraphNodeRecord } from "@anxionos/graph";
import {
	createF0KernelGraphSchemaRegistry,
	createInMemoryGraphStore,
	createKernelAwareTraversalEvaluator,
	createMockTraversalEvaluator,
	createTraversalCatalog,
	evaluateT12OutcomeAttribution,
	evaluateT14ConnectionRevokeImpact,
	GRAPH_F0_TRAVERSAL_ENTRIES,
	GRAPH_KERNEL_TRAVERSAL_ENTRIES,
	GRAPH_T12_INCOMPLETE_REASONS,
	GRAPH_T14_INCOMPLETE_REASONS,
	type InMemoryGraphEdge,
} from "@anxionos/graph";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const validAt = "2026-09-10T12:00:00.000Z";

function node(type: string, id: string): GraphNodeRecord {
	return {
		nodeKey: {
			scopeType: "AGENCY",
			scopeId: agencyId,
			type,
			id,
		},
		schemaVersion: 1,
		ownerDomain: "graph",
		status: "active",
		revision: 1,
		projectionGeneration: 1,
		payload: {},
	};
}

function edge(
	from: GraphNodeRecord,
	to: GraphNodeRecord,
	edgeType: string,
): InMemoryGraphEdge {
	return { edgeType, from: from.nodeKey, to: to.nodeKey };
}

describe("T12 outcome.attribution (ANX-303)", () => {
	test("collects fillIds via attribution and contribution edges", async () => {
		const outcomeId = randomUUID();
		const attributionId = randomUUID();
		const fillA = randomUUID();
		const fillB = randomUUID();
		const outcome = node("Outcome", outcomeId);
		const attribution = node("PerformanceAttribution", attributionId);
		const fillNodeA = node("Fill", fillA);
		const fillNodeB = node("Fill", fillB);
		const edges = [
			edge(attribution, outcome, "ATTRIBUTES_OUTCOME"),
			edge(fillNodeA, attribution, "CONTRIBUTION_FROM"),
			edge(fillNodeB, attribution, "CONTRIBUTION_FROM"),
		];
		const graphStore = createInMemoryGraphStore(
			[outcome, attribution, fillNodeA, fillNodeB],
			edges,
		);
		const result = await evaluateT12OutcomeAttribution(
			graphStore,
			{ outcomeNodeKey: outcome.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.fillIds.sort()).toEqual([fillA, fillB].sort());
	});

	test("returns incomplete when outcome node is missing", async () => {
		const graphStore = createInMemoryGraphStore();
		const result = await evaluateT12OutcomeAttribution(
			graphStore,
			{
				outcomeNodeKey: {
					scopeType: "AGENCY",
					scopeId: agencyId,
					type: "Outcome",
					id: randomUUID(),
				},
				validAt,
			},
			validAt,
		);
		expect(result.complete).toBe(false);
		expect(result.incompleteReasons).toContain(
			GRAPH_T12_INCOMPLETE_REASONS.OUTCOME_NOT_FOUND,
		);
	});

	test("returns incomplete for invalid temporal context", async () => {
		const outcome = node("Outcome", randomUUID());
		const graphStore = createInMemoryGraphStore([outcome]);
		const result = await evaluateT12OutcomeAttribution(
			graphStore,
			{ outcomeNodeKey: outcome.nodeKey, validAt: "not-a-datetime" },
			validAt,
		);
		expect(result.complete).toBe(false);
		expect(result.incompleteReasons).toContain(
			GRAPH_T12_INCOMPLETE_REASONS.INVALID_TEMPORAL_CONTEXT,
		);
	});
});

describe("T14 connection.revokeImpact (ANX-303)", () => {
	test("collects direct bindings and inference requests", async () => {
		const connectionId = randomUUID();
		const bindingId = randomUUID();
		const inferenceId = randomUUID();
		const connection = node("Connection", connectionId);
		const binding = node("AgentModelBinding", bindingId);
		const inference = node("InferenceRequest", inferenceId);
		const edges = [
			edge(binding, connection, "HAS_MODEL_BINDING"),
			edge(inference, binding, "HAS_ROUTING_DECISION"),
		];
		const graphStore = createInMemoryGraphStore(
			[connection, binding, inference],
			edges,
		);
		const result = await evaluateT14ConnectionRevokeImpact(
			graphStore,
			{ connectionNodeKey: connection.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.impactedBindingIds).toEqual([bindingId]);
		expect(result.impactedInferenceRequestIds).toEqual([inferenceId]);
	});

	test("collects bindings via model offering path", async () => {
		const connectionId = randomUUID();
		const offeringId = randomUUID();
		const bindingId = randomUUID();
		const connection = node("Connection", connectionId);
		const offering = node("ModelOffering", offeringId);
		const binding = node("AgentModelBinding", bindingId);
		const edges = [
			edge(offering, connection, "SERVED_VIA"),
			edge(offering, binding, "HAS_MODEL_BINDING"),
		];
		const graphStore = createInMemoryGraphStore(
			[connection, offering, binding],
			edges,
		);
		const result = await evaluateT14ConnectionRevokeImpact(
			graphStore,
			{ connectionNodeKey: connection.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.impactedBindingIds).toEqual([bindingId]);
		expect(result.impactedInferenceRequestIds).toEqual([]);
	});

	test("returns incomplete when connection node is missing", async () => {
		const graphStore = createInMemoryGraphStore();
		const result = await evaluateT14ConnectionRevokeImpact(
			graphStore,
			{
				connectionNodeKey: {
					scopeType: "AGENCY",
					scopeId: agencyId,
					type: "Connection",
					id: randomUUID(),
				},
				validAt,
			},
			validAt,
		);
		expect(result.complete).toBe(false);
		expect(result.incompleteReasons).toContain(
			GRAPH_T14_INCOMPLETE_REASONS.CONNECTION_NOT_FOUND,
		);
	});
});

describe("kernel-aware traversal evaluator (ANX-303)", () => {
	const fixture = {
		grant: { grantIds: [randomUUID()] },
		principalAgency: { principalId: randomUUID() },
		authorityEpoch: 1,
		riskEpoch: 0,
		projectionGeneration: 1,
		checkpoint: "ckpt-test",
	};

	test("handles T12 via graph store without delegating to inner F0 mock", async () => {
		const outcomeId = randomUUID();
		const fillId = randomUUID();
		const outcome = node("Outcome", outcomeId);
		const attribution = node("PerformanceAttribution", randomUUID());
		const fillNode = node("Fill", fillId);
		const edges = [
			edge(attribution, outcome, "ATTRIBUTES_OUTCOME"),
			edge(fillNode, attribution, "CONTRIBUTION_FROM"),
		];
		const graphStore = createInMemoryGraphStore(
			[outcome, attribution, fillNode],
			edges,
		);
		const evaluator = createKernelAwareTraversalEvaluator({
			graphStore,
			inner: createMockTraversalEvaluator(fixture),
			getCheckpoint: async () => "kernel-ckpt",
		});
		const result = await evaluator.evaluate({
			traversalId: "T12",
			input: { outcomeNodeKey: outcome.nodeKey, validAt },
			scope: {
				principalId: fixture.principalAgency.principalId,
				actingScope: { scopeType: "AGENCY", scopeId: agencyId },
			},
			temporal: { validAt, knownAt: validAt },
		});
		expect(result.data).toEqual({
			complete: true,
			fillIds: [fillId],
		});
		expect(result.checkpoint).toBe("kernel-ckpt");
	});

	test("delegates T01 to inner evaluator", async () => {
		const graphStore = createInMemoryGraphStore();
		const evaluator = createKernelAwareTraversalEvaluator({
			graphStore,
			inner: createMockTraversalEvaluator(fixture),
			getCheckpoint: async () => "inner-ckpt",
		});
		const result = await evaluator.evaluate({
			traversalId: "T01",
			input: {
				actorId: fixture.principalAgency.principalId,
				action: "graph.node.read",
				resource: { type: "node", id: randomUUID() },
			},
			scope: {
				principalId: fixture.principalAgency.principalId,
				actingScope: { scopeType: "AGENCY", scopeId: agencyId },
			},
			temporal: { validAt, knownAt: validAt },
		});
		expect(result.data).toMatchObject({ decision: "ALLOW" });
		expect(result.checkpoint).toBe("ckpt-test");
	});
});

describe("kernel traversal catalog (ANX-303)", () => {
	test("registers T12 and T14 with kernel edge allowlists", () => {
		const registry = createF0KernelGraphSchemaRegistry();
		const catalog = createTraversalCatalog(registry, [
			...GRAPH_F0_TRAVERSAL_ENTRIES,
			...GRAPH_KERNEL_TRAVERSAL_ENTRIES,
		]);
		const t12 = catalog.requireTraversal("T12", 1);
		const t14 = catalog.requireTraversal("T14", 1);
		expect(t12.class).toBe("kernel");
		expect(t12.edgeAllowlist).toContain("ATTRIBUTES_OUTCOME");
		expect(t14.class).toBe("kernel");
		expect(t14.edgeAllowlist).toContain("SERVED_VIA");
	});
});
