export {
	GRAPH_MODULE_OWNER_DOMAIN,
	createGraphSchemaRegistry,
	createInMemoryGraphSchemaRegistry,
	type GraphSchemaRegistry,
	type GraphSchemaRegistryInput,
} from "./domain/schema/registry";
export {
	AGENT_GRAPH_OWNER_DOMAIN,
	PRODUCT_GRAPH_OWNER_DOMAIN,
	createAgentGraphSchemaRegistry,
	createProductAgentGraphSchemaRegistry,
	createProductGraphSchemaRegistry,
} from "./domain/schema/product-agent-schema-registry";
export { createF0KernelGraphSchemaRegistry } from "./domain/schema/f0-kernel-schema-registry";
export { createF0KernelDomainGraphSchemaRegistry } from "./domain/schema/f0-kernel-domain-schema-registry";
export {
	TRAVERSAL_OWNER_CONSUMER_DOMAINS,
	resolveOwnerConsumerDomains,
} from "./domain/schema/owner-consumer-matrix";
export {
	GraphSchemaRegistryError,
	type GraphSchemaRegistryErrorCode,
} from "./domain/schema/errors";
export {
	GRAPH_F0_TRAVERSAL_ENTRIES,
	GRAPH_KERNEL_TRAVERSAL_ENTRIES,
	GRAPH_OWNER_CONSUMER_TRAVERSAL_ENTRIES,
	createTraversalCatalog,
	type TraversalCatalog,
	type TraversalCatalogEntry,
	type TraversalClass,
	type TraversalCacheable,
} from "./domain/schema/traversal-catalog";
export {
	createSubPlanRegistry,
	type SubPlanRegistry,
	type TraversalSubPlan,
	type TraversalSubPlanRegistration,
} from "./domain/schema/sub-plan-registry";
export type {
	CreateRebuildJobInput,
	GraphEdgeRecord,
	GraphNodeRecord,
	GraphStore,
	ProjectionInbox,
	ProjectionInboxClaimInput,
	ProjectionInboxClaimResult,
	ProjectionInboxEntry,
	ProjectionInboxStatus,
	RebuildControl,
	RebuildJob,
	RebuildJobStatus,
} from "./domain/ports";
export { createGraphDb } from "./infrastructure/create-db";
export { ensureGraphSchema } from "./infrastructure/migrate";
export {
	graphCurrentGeneration,
	graphProjectionDlq,
	graphProjectionGeneration,
	graphProjectionInbox,
	graphRebuildJobs,
	graphRegistryGeneration,
	graphSchemaEdgeTypes,
	graphSchemaNodeTypes,
	graphTraversalCatalog,
} from "./infrastructure/persistence/schema";
export {
	GRAPH_AGENTS_CONSUMER_NAME,
	GRAPH_GOVERNANCE_CONSUMER_NAME,
	GRAPH_IDENTITY_CONSUMER_NAME,
	GRAPH_ORGANIZATIONS_CONSUMER_NAME,
	GRAPH_PRODUCT_CONSUMER_NAME,
	GRAPH_PERFORMANCE_CONSUMER_NAME,
	GRAPH_PROJECTION_DEFAULT_CHECKPOINT,
	GRAPH_PROJECTION_MAX_ATTEMPTS,
} from "./domain/projections/constants";
export {
	ProjectionError,
	isProjectionError,
	type ProjectionErrorClassification,
} from "./domain/projections/errors";
export { processWithInbox } from "./infrastructure/projections/inbox/process-with-inbox";
export type {
	ProcessWithInboxOptions,
	ProcessWithInboxResult,
	ProcessWithInboxStatus,
	ProjectionHandler,
	ProjectionHandlerContext,
} from "./application/projections/inbox/projection-handler";
export {
	organizationsProjectionConsumer,
	projectOrganizationsEvent,
} from "./application/projections/organizations/organizations-projector";
export {
	governanceProjectionConsumer,
	projectGovernanceEvent,
} from "./application/projections/governance/governance-projector";
export {
	productProjectionConsumer,
	projectProductGraphEvent,
} from "./application/projections/product/product-graph-projector";
export {
	performanceProjectionConsumer,
	projectPerformanceGraphEvent,
} from "./application/projections/performance/performance-graph-projector";
export {
	agentProjectionConsumer,
	projectAgentGraphEvent,
} from "./application/projections/agents/agent-graph-projector";
export {
	handleProjectionMessage,
	type GraphProjectionConsumerDefinition,
	type HandleProjectionMessageInput,
} from "./workers/projection-consumer";
export {
	createPgProjectionInbox,
	findInboxEntry,
} from "./infrastructure/persistence/inbox-repository";
export {
	buildRedactedPayloadRef,
	insertDlqEntry,
} from "./infrastructure/persistence/dlq-repository";
export {
	createTrackingNatsMessagePort,
	nakDelayMs,
} from "./infrastructure/messaging/nats-message-port";
export type { NatsMessagePort } from "./domain/ports/nats-message-port";
export {
	GRAPH_REBUILD_CONSUMER_BY_DOMAIN,
	GRAPH_REBUILD_OWNER_DOMAIN_ORDER,
	GRAPH_REBUILD_PENDING_BLOCK_THRESHOLD,
	GRAPH_REBUILD_TERMINAL_STATUSES,
} from "./domain/rebuild/constants";
export { RebuildError, isRebuildError } from "./domain/rebuild/errors";
export {
	executeFullGenerationSwap,
	startFullGenerationSwap,
	type ExecuteFullGenerationSwapInput,
	type FullGenerationSwapPhase,
	type FullGenerationSwapResult,
	type RebuildCacheControl,
	type RebuildConsumerControl,
	type RebuildF0Oracle,
	type RebuildGenerationStore,
	type RebuildReplayPort,
	type StartFullGenerationSwapInput,
} from "./application/rebuild/full-generation-swap";
export {
	runRebuildWorker,
	tryAcquireRebuildLeaderLock,
	type RebuildLeaderLock,
	type RunRebuildWorkerInput,
	type RunRebuildWorkerResult,
} from "./workers/rebuild-worker";
export {
	bumpRegistryGeneration,
	countPendingInboxEntries,
	createPgRebuildControl,
	findActiveRebuildJob,
	findRebuildJobById,
	getCurrentGeneration,
	getProjectionGeneration,
	getRegistryGeneration,
	swapCurrentGeneration,
} from "./infrastructure/persistence/rebuild-job-repository";
export {
	buildGraphCacheRedisKeyFromInput,
	buildGraphCacheKeyParts,
	buildQueryHash,
	buildScopeHash,
	GRAPH_CACHE_KEY_PREFIX,
	type BuildGraphCacheKeyInput,
} from "./infrastructure/cache/cache-key-builder";
export {
	GRAPH_CACHE_INVALIDATE_CHANNEL,
	createRedisL2Cache,
	parseGraphCacheInvalidateMessage,
	resolveL2TtlSeconds,
	subscribeGraphCacheInvalidation,
	type GraphCacheRedisCommandPort,
	type RedisL2Cache,
} from "./infrastructure/cache/redis-l2-cache";
export {
	createGraphCacheRebuildControl,
	createGraphReadCache,
	createPostAckCacheInvalidationHook,
	getOrLoadGraphCacheValue,
	resolveGraphCacheMode,
	shouldCacheTraversalResult,
	startGraphCacheInvalidationListener,
	type GraphCacheEntry,
	type GraphCacheLookupInput,
	type GraphCacheMode,
	type GraphReadCache,
	type GraphReadCacheOptions,
	type PostAckCacheInvalidationInput,
} from "./infrastructure/cache/graph-cache";
export {
	adminDlqReplayInputSchema,
	adminRebuildInputSchema,
	handleAdminDlqReplay,
	handleAdminRebuild,
} from "./application/http/admin-handlers";
export {
	GraphHttpError,
	toGraphErrorBody,
} from "./application/http/graph-http-error";
export type { GraphHttpRuntime } from "./application/http/graph-runtime";
export {
	GraphTraversalRateLimiter,
	buildTraversalRateLimitKey,
} from "./application/http/graph-rate-limit";
export {
	assertEnvelopeScopeMatches,
	assertNodeReadable,
	isNodeReadable,
} from "./application/http/scope-enforcement";
export {
	handleNodeGet,
	handleNodesBatchGet,
} from "./application/http/node-handlers";
export {
	assertTraversalRateLimit,
	handleTraversal,
} from "./application/http/traversal-handlers";
export {
	createPendingProjectionRegistry,
	type PendingProjectionRegistry,
} from "./application/http/pending-projection-registry";
export { handleTraversalNeighbors } from "./application/http/neighbors-handlers";
export {
	createInMemoryGraphStore,
	type InMemoryGraphEdge,
} from "./infrastructure/adapters/in-memory-graph-store";
export {
	createKernelAwareTraversalEvaluator,
} from "./infrastructure/adapters/kernel-aware-traversal-evaluator";
export {
	createMockTraversalEvaluator,
	type GraphF0Fixture,
} from "./infrastructure/adapters/mock-traversal-evaluator";
export {
	GRAPH_T01_DENY_REASONS,
	evaluateT01Grants,
	filterMatchingGrants,
	filterGrantsByTemporalContext,
	grantMatchesT01,
	resolveGrantScope,
	toT03Output,
} from "./application/traversal/t01-grant-evaluation";
export {
	GRAPH_T12_INCOMPLETE_REASONS,
	evaluateT12OutcomeAttribution,
} from "./application/traversal/t12-outcome-attribution";
export {
	GRAPH_T14_INCOMPLETE_REASONS,
	evaluateT14ConnectionRevokeImpact,
} from "./application/traversal/t14-connection-revoke-impact";
export {
	GRAPH_T02_INCOMPLETE_REASONS,
	evaluateT02Temporal,
	grantPayloadToTemporalInterval,
	isBitemporallyActive,
} from "./application/traversal/t02-temporal-evaluation";
export {
	evaluateT06GoalDependencies,
	evaluateT07CapitalUnderAgent,
	evaluateT08StrategyDeployments,
	evaluateT09ExposureByAsset,
	evaluateT10DecisionLineage,
	evaluateT10LineageUpstream,
	evaluateT11FillAuthorizationChain,
	evaluateT13SuspendImpact,
	evaluateT15ConnectionsListModels,
	evaluateT16RoutingTrace,
	evaluateT17UsageCosts,
	evaluateT18ReconciliationOpenCases,
	evaluateT19SimulationAuthorityDiff,
	evaluateT20CommercialAttribution,
} from "./application/traversal/owner-consumer";
export { formatNodeKey, parseNodeKey } from "./domain/node-key";
