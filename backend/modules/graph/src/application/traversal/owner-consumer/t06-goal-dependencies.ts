import type { T06Input, T06Output } from "@anxionos/contracts/graph";
import type { NodeKey } from "@anxionos/contracts/graph";
import type { GraphStore } from "../../../domain/ports/graph-store";
import { formatNodeKey } from "../../../domain/node-key";
import {
	collectNeighborIds,
	guardTemporal,
	requireAnchorNode,
} from "./traversal-common";

const T06_EDGES = {
	HAS_SUBGOAL: "HAS_SUBGOAL",
	ADVANCES_GOAL: "ADVANCES_GOAL",
	DEPENDS_ON_TASK: "DEPENDS_ON_TASK",
} as const;

async function collectTaskDependencies(
	graphStore: GraphStore,
	startKey: NodeKey,
	maxDepth: number,
): Promise<{ taskIds: Set<string>; hasCycle: boolean }> {
	const taskIds = new Set<string>();
	const visited = new Set<string>();
	const onStack = new Set<string>();

	async function walk(nodeKey: NodeKey, depth: number): Promise<boolean> {
		const key = formatNodeKey(nodeKey);
		if (onStack.has(key)) {
			return true;
		}
		if (visited.has(key) || depth > maxDepth) {
			return false;
		}
		visited.add(key);
		onStack.add(key);

		const deps = await graphStore.listNeighbors({
			startNodeKey: nodeKey,
			edgeTypes: [T06_EDGES.DEPENDS_ON_TASK],
			direction: "OUT",
			maxResults: 256,
		});
		for (const edge of deps) {
			if (edge.targetNodeKey.type === "Task" || edge.targetNodeKey.type === "WorkItem") {
				taskIds.add(edge.targetNodeKey.id);
			}
			const cycle = await walk(edge.targetNodeKey, depth + 1);
			if (cycle) {
				onStack.delete(key);
				return true;
			}
		}
		onStack.delete(key);
		return false;
	}

	const hasCycle = await walk(startKey, 0);
	return { taskIds, hasCycle };
}

export async function evaluateT06GoalDependencies(
	graphStore: GraphStore,
	input: T06Input,
	knownAt?: string,
): Promise<T06Output> {
	const temporalGuard = guardTemporal(input.validAt, knownAt);
	if (temporalGuard) {
		return {
			complete: false,
			dependencyTaskIds: [],
			blockedTaskIds: [],
			hasCycle: false,
			incompleteReasons: temporalGuard.incompleteReasons,
		};
	}

	const anchor = await requireAnchorNode(graphStore, input.goalNodeKey, "Goal");
	if (!("nodeKey" in anchor)) {
		return {
			complete: false,
			dependencyTaskIds: [],
			blockedTaskIds: [],
			hasCycle: false,
			incompleteReasons: anchor.incompleteReasons,
		};
	}

	const subgoalTaskIds = await collectNeighborIds(
		graphStore,
		input.goalNodeKey,
		[T06_EDGES.HAS_SUBGOAL, T06_EDGES.ADVANCES_GOAL],
		"IN",
		"Task",
	);
	const { taskIds: depTaskIds, hasCycle } = await collectTaskDependencies(
		graphStore,
		input.goalNodeKey,
		input.maxDepth,
	);

	const dependencyTaskIds = [...new Set([...subgoalTaskIds, ...depTaskIds])];
	const blockedTaskIds = hasCycle ? [...dependencyTaskIds] : [];

	return {
		complete: true,
		dependencyTaskIds,
		blockedTaskIds,
		hasCycle,
	};
}
