import type { DlqReplayPort } from "../../domain/ports/dlq-replay-port";
import type { GraphDatabasePool } from "../../domain/ports/graph-database-pool";
import type {
	GraphCacheLookupInput,
	GraphReadCache,
} from "../../domain/ports/graph-read-cache";
import type { GraphStore } from "../../domain/ports/graph-store";
import type { RebuildControl } from "../../domain/ports/rebuild-control";
import type { TraversalEvaluator } from "../../domain/ports/traversal-evaluator";
import type { TraversalCatalog } from "../../domain/schema/traversal-catalog";
import type { GraphTraversalRateLimiter } from "./graph-rate-limit";
import type { PendingProjectionRegistry } from "./pending-projection-registry";

export interface GraphHttpRuntime {
	pool: GraphDatabasePool;
	graphStore: GraphStore;
	traversalEvaluator: TraversalEvaluator;
	cache: GraphReadCache;
	catalog: TraversalCatalog;
	rebuildControl: RebuildControl;
	pendingProjections: PendingProjectionRegistry;
	rateLimiter: GraphTraversalRateLimiter;
	getRegistryGeneration(): Promise<number>;
	dlqReplay: DlqReplayPort;
	buildCacheKey(input: GraphCacheLookupInput): string;
	resolveCacheTtlSeconds(input: GraphCacheLookupInput): number;
	getCheckpoint(): Promise<string>;
}
