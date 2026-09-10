export { createNeo4jDriver, createNeo4jDriverFromEnv } from "./client";
export {
	ensureNeo4jGraphConstraints,
	loadNeo4jConstraintStatements,
} from "./bootstrap-constraints";
export { createNeo4jGraphStore } from "./graph-store-adapter";
export { createNeo4jTraversalEvaluator } from "./traversal-evaluator";
export { formatNodeKey, parseNodeKey } from "./node-key";

import { createKernelAwareTraversalEvaluator } from "../kernel-aware-traversal-evaluator";
import type { CreateNeo4jTraversalEvaluatorDeps } from "./traversal-evaluator";
import { createNeo4jTraversalEvaluator } from "./traversal-evaluator";

/** Neo4j F0 evaluator wrapped with T12/T14 kernel handlers. */
export function createNeo4jKernelAwareTraversalEvaluator(
	deps: CreateNeo4jTraversalEvaluatorDeps & { graphStore: import("../../../domain/ports/graph-store").GraphStore },
) {
	return createKernelAwareTraversalEvaluator({
		graphStore: deps.graphStore,
		inner: createNeo4jTraversalEvaluator(deps),
		getCheckpoint: deps.getCheckpoint,
		riskEpoch: deps.riskEpoch,
	});
}
