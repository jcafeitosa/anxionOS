import type { T13Input, T13Output } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T13_EDGES = {
	ASSIGNED_TO: "ASSIGNED_TO",
	HAS_DEPLOYMENT: "HAS_DEPLOYMENT",
	PURSUES_GOAL: "PURSUES_GOAL",
} as const;

export async function evaluateT13SuspendImpact(
	graphStore: GraphStore,
	input: T13Input,
	knownAt?: string,
): Promise<T13Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			impactedAgentIds: [],
			impactedDeploymentIds: [],
			blockedNewWork: false,
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const subjectType = input.subjectNodeKey.type;
	const anchor = await requireAnchorNode(graphStore, input.subjectNodeKey, subjectType);
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			impactedAgentIds: [],
			impactedDeploymentIds: [],
			blockedNewWork: false,
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const impactedAgentIds = new Set<string>();
	const impactedDeploymentIds = new Set<string>();

	if (subjectType === "Agent") {
		impactedAgentIds.add(input.subjectNodeKey.id);
		const deploymentsByManaged = await collectNeighborIds(
			graphStore,
			input.subjectNodeKey,
			[T13_EDGES.HAS_DEPLOYMENT],
			"IN",
			"Deployment",
		);
		const deploymentsByExecutor = await collectNeighborIds(
			graphStore,
			input.subjectNodeKey,
			["EXECUTED_BY_AGENT"],
			"IN",
			"Deployment",
		);
		for (const id of [...deploymentsByManaged, ...deploymentsByExecutor]) {
			impactedDeploymentIds.add(id);
		}
	} else if (subjectType === "StrategyVersion") {
		const deployments = await collectNeighborIds(
			graphStore,
			input.subjectNodeKey,
			[T13_EDGES.HAS_DEPLOYMENT],
			"IN",
			"Deployment",
		);
		for (const id of deployments) {
			impactedDeploymentIds.add(id);
		}
	} else if (subjectType === "Task") {
		const agents = await collectNeighborIds(
			graphStore,
			input.subjectNodeKey,
			[T13_EDGES.ASSIGNED_TO],
			"OUT",
			"Agent",
		);
		for (const id of agents) {
			impactedAgentIds.add(id);
		}
	}

	const blockedNewWork = input.action === "SUSPEND_NEW_WORK";

	return {
		complete: true,
		impactedAgentIds: [...impactedAgentIds],
		impactedDeploymentIds: [...impactedDeploymentIds],
		blockedNewWork,
	};
}
