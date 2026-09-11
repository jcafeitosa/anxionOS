/**
 * ANX-305 - Graph S5: T06-T20 owner-consumer traversals.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { GraphNodeRecord } from "@anxionos/graph";
import {
	createF0KernelDomainGraphSchemaRegistry,
	createInMemoryGraphStore,
	createKernelAwareTraversalEvaluator,
	createMockTraversalEvaluator,
	createTraversalCatalog,
	evaluateT06GoalDependencies,
	evaluateT07CapitalUnderAgent,
	evaluateT08StrategyDeployments,
	evaluateT09ExposureByAsset,
	evaluateT10LineageUpstream,
	evaluateT11FillAuthorizationChain,
	evaluateT13SuspendImpact,
	evaluateT15ConnectionsListModels,
	evaluateT16RoutingTrace,
	evaluateT17UsageCosts,
	evaluateT18ReconciliationOpenCases,
	evaluateT19SimulationAuthorityDiff,
	evaluateT20CommercialAttribution,
	GRAPH_OWNER_CONSUMER_TRAVERSAL_ENTRIES,
	type InMemoryGraphEdge,
	TRAVERSAL_OWNER_CONSUMER_DOMAINS,
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

describe("owner-consumer traversal catalog (ANX-305)", () => {
	test("registers T06-T20 with domain edge allowlists", () => {
		const registry = createF0KernelDomainGraphSchemaRegistry();
		const catalog = createTraversalCatalog(registry, [
			...GRAPH_OWNER_CONSUMER_TRAVERSAL_ENTRIES,
		]);
		expect(catalog.listTraversals().length).toBe(13);
		const t06 = catalog.requireTraversal("T06", 1);
		const t16 = catalog.requireTraversal("T16", 1);
		expect(t06.class).toBe("domain");
		expect(t06.edgeAllowlist).toContain("DEPENDS_ON_TASK");
		expect(t16.edgeAllowlist).toContain("HAS_ROUTING_DECISION");
		expect(TRAVERSAL_OWNER_CONSUMER_DOMAINS.T06).toContain("orchestration");
	});
});

describe("T06 goal.dependencies (ANX-305)", () => {
	test("collects WorkItem dependencies via DEPENDS_ON_TASK", async () => {
		const goalId = randomUUID();
		const taskId = randomUUID();
		const goal = node("Goal", goalId);
		const task = node("Task", taskId);
		const graphStore = createInMemoryGraphStore(
			[goal, task],
			[edge(goal, task, "DEPENDS_ON_TASK")],
		);
		const result = await evaluateT06GoalDependencies(
			graphStore,
			{ goalNodeKey: goal.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.dependencyTaskIds).toEqual([taskId]);
		expect(result.hasCycle).toBe(false);
	});
});

describe("T10 lineage.upstream (ANX-305)", () => {
	test("collects agentIds via MADE_BY (Decision -> Agent)", async () => {
		const decisionId = randomUUID();
		const authorId = randomUUID();
		const decision = node("Decision", decisionId);
		const author = node("Agent", authorId);
		const graphStore = createInMemoryGraphStore(
			[decision, author],
			[edge(decision, author, "MADE_BY")],
		);
		const result = await evaluateT10LineageUpstream(
			graphStore,
			{ decisionNodeKey: decision.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.agentIds).toEqual([authorId]);
	});
});

describe("T13 suspend.impact (ANX-305)", () => {
	test("collects impacted deployments for suspended agent", async () => {
		const agentId = randomUUID();
		const deploymentId = randomUUID();
		const agent = node("Agent", agentId);
		const deployment = node("Deployment", deploymentId);
		const graphStore = createInMemoryGraphStore(
			[agent, deployment],
			[edge(deployment, agent, "HAS_DEPLOYMENT")],
		);
		const result = await evaluateT13SuspendImpact(
			graphStore,
			{
				subjectNodeKey: agent.nodeKey,
				action: "SUSPEND_AGENT",
				validAt,
			},
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.impactedAgentIds).toContain(agentId);
		expect(result.impactedDeploymentIds).toEqual([deploymentId]);
	});
});

describe("T16 routing.trace (ANX-305)", () => {
	test("collects routing decisions and inference attempts", async () => {
		const requestId = randomUUID();
		const routingId = randomUUID();
		const attemptId = randomUUID();
		const request = node("InferenceRequest", requestId);
		const routing = node("RoutingDecision", routingId);
		const attempt = node("InferenceAttempt", attemptId);
		const graphStore = createInMemoryGraphStore(
			[request, routing, attempt],
			[
				edge(request, routing, "HAS_ROUTING_DECISION"),
				edge(routing, attempt, "HAS_INFERENCE_ATTEMPT"),
			],
		);
		const result = await evaluateT16RoutingTrace(
			graphStore,
			{ inferenceRequestNodeKey: request.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.routingDecisionIds).toEqual([routingId]);
		expect(result.attemptIds).toEqual([attemptId]);
	});
});

describe("T07 capital.underAgent (ANX-305)", () => {
	test("collects portfolios and capital accounts", async () => {
		const agentId = randomUUID();
		const portfolioId = randomUUID();
		const accountId = randomUUID();
		const agent = node("Agent", agentId);
		const portfolio = node("Portfolio", portfolioId);
		const account = node("CapitalAccount", accountId);
		const graphStore = createInMemoryGraphStore(
			[agent, portfolio, account],
			[
				edge(portfolio, agent, "MANAGED_BY"),
				edge(portfolio, account, "FROM_CAPITAL_ACCOUNT"),
			],
		);
		const result = await evaluateT07CapitalUnderAgent(
			graphStore,
			{ agentNodeKey: agent.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.portfolioIds).toEqual([portfolioId]);
		expect(result.accountIds).toEqual([accountId]);
	});
});

describe("T08 strategy.deployments (ANX-305)", () => {
	test("collects deployments and executing agents", async () => {
		const strategyId = randomUUID();
		const deploymentId = randomUUID();
		const agentId = randomUUID();
		const strategy = node("Strategy", strategyId);
		const deployment = node("Deployment", deploymentId);
		const agent = node("Agent", agentId);
		const graphStore = createInMemoryGraphStore(
			[strategy, deployment, agent],
			[
				edge(strategy, deployment, "HAS_DEPLOYMENT"),
				edge(deployment, agent, "EXECUTED_BY_AGENT"),
			],
		);
		const result = await evaluateT08StrategyDeployments(
			graphStore,
			{ strategyNodeKey: strategy.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.deploymentIds).toEqual([deploymentId]);
		expect(result.agentIds).toEqual([agentId]);
	});
});

describe("T09 exposure.byAsset (ANX-305)", () => {
	test("sums exposure for matching asset", async () => {
		const portfolioId = randomUUID();
		const positionId = randomUUID();
		const instrumentId = randomUUID();
		const assetId = randomUUID();
		const portfolio = node("Portfolio", portfolioId);
		const position = {
			...node("Position", positionId),
			payload: { quantity: 10, markPrice: 5 },
		};
		const instrument = node("Instrument", instrumentId);
		const asset = node("Asset", assetId);
		const graphStore = createInMemoryGraphStore(
			[portfolio, position, instrument, asset],
			[
				edge(portfolio, position, "HAS_POSITION"),
				edge(position, instrument, "ON_INSTRUMENT"),
				edge(instrument, asset, "REPRESENTS_ASSET"),
			],
		);
		const result = await evaluateT09ExposureByAsset(
			graphStore,
			{ scopeNodeKey: portfolio.nodeKey, assetId, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.grossExposure).toBe(50);
		expect(result.netExposure).toBe(50);
	});
});

describe("T11 fill.authorizationChain (ANX-305)", () => {
	test("collects grantIds from approval chain", async () => {
		const fillId = randomUUID();
		const orderId = randomUUID();
		const approvalId = randomUUID();
		const grantId = randomUUID();
		const fill = node("Fill", fillId);
		const order = node("Order", orderId);
		const approval = {
			...node("Approval", approvalId),
			payload: { grantId, approvalAgentId: randomUUID() },
		};
		const graphStore = createInMemoryGraphStore(
			[fill, order, approval],
			[edge(fill, order, "FILLED_AS"), edge(order, approval, "CHECKED_BY")],
		);
		const result = await evaluateT11FillAuthorizationChain(
			graphStore,
			{ fillNodeKey: fill.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.grantIds).toEqual([grantId]);
	});
});

describe("T15 connections.listModels (ANX-305)", () => {
	test("collects eligible offerings from binding", async () => {
		const bindingId = randomUUID();
		const offeringId = randomUUID();
		const binding = node("AgentModelBinding", bindingId);
		const offering = node("ModelOffering", offeringId);
		const graphStore = createInMemoryGraphStore(
			[binding, offering],
			[edge(binding, offering, "SELECTS_MODEL")],
		);
		const result = await evaluateT15ConnectionsListModels(
			graphStore,
			{
				bindingNodeKey: binding.nodeKey,
				consumerKind: "agent",
				validAt,
			},
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.eligibleOfferingIds).toEqual([offeringId]);
	});
});

describe("T17 usage.costs (ANX-305)", () => {
	test("aggregates usage records in interval", async () => {
		const agentId = randomUUID();
		const usageId = randomUUID();
		const agent = node("Agent", agentId);
		const usage = {
			...node("UsageRecord", usageId),
			payload: { occurredAt: "2026-09-10T11:00:00.000Z", costUsd: 2.5 },
		};
		const graphStore = createInMemoryGraphStore(
			[agent, usage],
			[edge(usage, agent, "GENERATED_USAGE")],
		);
		const result = await evaluateT17UsageCosts(
			graphStore,
			{
				scopeNodeKey: agent.nodeKey,
				intervalStart: "2026-09-10T10:00:00.000Z",
				intervalEnd: "2026-09-10T12:00:00.000Z",
				validAt,
			},
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.usageRecordIds).toEqual([usageId]);
		expect(result.totalCostUsd).toBe(2.5);
	});
});

describe("T18 reconciliation.openCases (ANX-305)", () => {
	test("lists open reconciliation cases for resource", async () => {
		const portfolioId = randomUUID();
		const caseId = randomUUID();
		const portfolio = node("Portfolio", portfolioId);
		const caseNode = {
			...node("ReconciliationCase", caseId),
			payload: { status: "OPEN", differenceUsd: 12.34 },
		};
		const graphStore = createInMemoryGraphStore(
			[portfolio, caseNode],
			[edge(caseNode, portfolio, "RECONCILES_RESOURCE")],
		);
		const result = await evaluateT18ReconciliationOpenCases(
			graphStore,
			{ resourceNodeKey: portfolio.nodeKey, status: "OPEN", validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.caseIds).toEqual([caseId]);
		expect(result.differenceUsd).toBe(12.34);
	});
});

describe("T19 simulation.authorityDiff (ANX-305)", () => {
	test("collects required approvals from change proposals", async () => {
		const snapshotId = randomUUID();
		const proposalId = randomUUID();
		const grantId = randomUUID();
		const snapshot = node("GraphSnapshot", snapshotId);
		const proposal = node("ChangeProposal", proposalId);
		const grant = node("AuthorityGrant", grantId);
		const graphStore = createInMemoryGraphStore(
			[snapshot, proposal, grant],
			[
				edge(proposal, snapshot, "USES_SNAPSHOT"),
				edge(proposal, grant, "TESTS_CHANGE"),
			],
		);
		const result = await evaluateT19SimulationAuthorityDiff(
			graphStore,
			{ snapshotNodeKey: snapshot.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.requiredApprovalIds).toEqual([grantId]);
	});
});

describe("T20 commercial.attribution (ANX-305)", () => {
	test("collects commissions and invoices for referral", async () => {
		const referralId = randomUUID();
		const commissionId = randomUUID();
		const invoiceId = randomUUID();
		const referral = node("Referral", referralId);
		const commission = node("Commission", commissionId);
		const invoice = node("Invoice", invoiceId);
		const graphStore = createInMemoryGraphStore(
			[referral, commission, invoice],
			[
				edge(commission, referral, "ATTRIBUTED_TO"),
				edge(commission, invoice, "EARNED_FROM"),
			],
		);
		const result = await evaluateT20CommercialAttribution(
			graphStore,
			{ referralNodeKey: referral.nodeKey, validAt },
			validAt,
		);
		expect(result.complete).toBe(true);
		expect(result.commissionIds).toEqual([commissionId]);
		expect(result.invoiceIds).toEqual([invoiceId]);
	});
});

describe("kernel-aware evaluator owner-consumer dispatch (ANX-305)", () => {
	const fixture = {
		grant: { grantIds: [randomUUID()] },
		principalAgency: { principalId: randomUUID() },
		authorityEpoch: 1,
		riskEpoch: 0,
		projectionGeneration: 1,
		checkpoint: "ckpt-test",
	};

	test("handles T06 without delegating to inner F0 mock", async () => {
		const goalId = randomUUID();
		const taskId = randomUUID();
		const goal = node("Goal", goalId);
		const task = node("Task", taskId);
		const graphStore = createInMemoryGraphStore(
			[goal, task],
			[edge(goal, task, "DEPENDS_ON_TASK")],
		);
		const evaluator = createKernelAwareTraversalEvaluator({
			graphStore,
			inner: createMockTraversalEvaluator(fixture),
			getCheckpoint: async () => "owner-ckpt",
		});
		const result = await evaluator.evaluate({
			traversalId: "T06",
			input: { goalNodeKey: goal.nodeKey, validAt },
			scope: {
				principalId: fixture.principalAgency.principalId,
				actingScope: { scopeType: "AGENCY", scopeId: agencyId },
			},
			temporal: { validAt, knownAt: validAt },
		});
		expect(result.data).toMatchObject({
			complete: true,
			dependencyTaskIds: [taskId],
		});
		expect(result.checkpoint).toBe("owner-ckpt");
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
