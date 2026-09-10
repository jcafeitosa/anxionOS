import {
	TRAVERSAL_T01_META,
	TRAVERSAL_T02_META,
	TRAVERSAL_T03_META,
	TRAVERSAL_T04_META,
	TRAVERSAL_T05_META,
	TRAVERSAL_T06_META,
	TRAVERSAL_T07_META,
	TRAVERSAL_T08_META,
	TRAVERSAL_T09_META,
	TRAVERSAL_T10_META,
	TRAVERSAL_T11_META,
	TRAVERSAL_T12_META,
	TRAVERSAL_T13_META,
	TRAVERSAL_T14_META,
	TRAVERSAL_T15_META,
	TRAVERSAL_T16_META,
	TRAVERSAL_T17_META,
	TRAVERSAL_T18_META,
	TRAVERSAL_T19_META,
	TRAVERSAL_T20_META,
} from "@anxionos/contracts/graph";
import { GraphSchemaRegistryError } from "./errors";
import type { GraphSchemaRegistry } from "./registry";

function traversalKey(traversalId, queryVersion) {
	return `${traversalId}:${queryVersion}`;
}
/** F0 authorization traversals — edge allowlist ⊆ GRAPH_F0_EDGE_TYPES. */
export const GRAPH_F0_TRAVERSAL_ENTRIES = [
	{
		traversalId: TRAVERSAL_T01_META.traversalId,
		queryVersion: TRAVERSAL_T01_META.queryVersion,
		class: TRAVERSAL_T01_META.class,
		edgeAllowlist: ["HAS_GRANT", "HAS_MEMBERSHIP", "AGENCY_MEMBERSHIP"],
		inputSchemaRef: "graph/traversals/T01.input.json",
		outputSchemaRef: "graph/traversals/T01.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T01_META.cacheable,
		fixtureVersion: "f0",
	},
	{
		traversalId: TRAVERSAL_T03_META.traversalId,
		queryVersion: TRAVERSAL_T03_META.queryVersion,
		class: TRAVERSAL_T03_META.class,
		edgeAllowlist: ["HAS_GRANT", "HAS_MEMBERSHIP", "AGENCY_MEMBERSHIP"],
		inputSchemaRef: "graph/traversals/T03.input.json",
		outputSchemaRef: "graph/traversals/T03.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T03_META.cacheable,
		fixtureVersion: "f0",
	},
	{
		traversalId: TRAVERSAL_T02_META.traversalId,
		queryVersion: TRAVERSAL_T02_META.queryVersion,
		class: TRAVERSAL_T02_META.class,
		edgeAllowlist: ["HAS_GRANT", "HAS_MEMBERSHIP", "AGENCY_MEMBERSHIP"],
		inputSchemaRef: "graph/traversals/T02.input.json",
		outputSchemaRef: "graph/traversals/T02.output.json",
		maxDepth: 4,
		maxVisited: 64,
		cacheable: TRAVERSAL_T02_META.cacheable,
		fixtureVersion: "f0",
	},
	{
		traversalId: TRAVERSAL_T04_META.traversalId,
		queryVersion: TRAVERSAL_T04_META.queryVersion,
		class: TRAVERSAL_T04_META.class,
		edgeAllowlist: ["HAS_GRANT", "HAS_MEMBERSHIP", "AGENCY_MEMBERSHIP"],
		inputSchemaRef: "graph/traversals/T04.input.json",
		outputSchemaRef: "graph/traversals/T04.output.json",
		maxDepth: 4,
		maxVisited: 64,
		cacheable: TRAVERSAL_T04_META.cacheable,
		fixtureVersion: "f0",
	},
	{
		traversalId: TRAVERSAL_T05_META.traversalId,
		queryVersion: TRAVERSAL_T05_META.queryVersion,
		class: TRAVERSAL_T05_META.class,
		edgeAllowlist: ["HAS_GRANT", "HAS_MEMBERSHIP", "AGENCY_MEMBERSHIP"],
		inputSchemaRef: "graph/traversals/T05.input.json",
		outputSchemaRef: "graph/traversals/T05.output.json",
		maxDepth: 8,
		maxVisited: 128,
		cacheable: TRAVERSAL_T05_META.cacheable,
		fixtureVersion: "f0",
	},
];

/** Kernel traversals T12/T14 (ANX-303). */
export const GRAPH_KERNEL_TRAVERSAL_ENTRIES = [
	{
		traversalId: TRAVERSAL_T12_META.traversalId,
		queryVersion: TRAVERSAL_T12_META.queryVersion,
		class: TRAVERSAL_T12_META.class,
		edgeAllowlist: ["ATTRIBUTES_OUTCOME", "CONTRIBUTION_FROM"],
		inputSchemaRef: "graph/traversals/T12.input.json",
		outputSchemaRef: "graph/traversals/T12.output.json",
		maxDepth: 6,
		maxVisited: 128,
		cacheable: TRAVERSAL_T12_META.cacheable,
		fixtureVersion: "kernel-p3",
	},
	{
		traversalId: TRAVERSAL_T14_META.traversalId,
		queryVersion: TRAVERSAL_T14_META.queryVersion,
		class: TRAVERSAL_T14_META.class,
		edgeAllowlist: [
			"SERVED_VIA",
			"HAS_MODEL_BINDING",
			"HAS_ROUTING_DECISION",
		],
		inputSchemaRef: "graph/traversals/T14.input.json",
		outputSchemaRef: "graph/traversals/T14.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T14_META.cacheable,
		fixtureVersion: "kernel-p3",
	},
];

/** Owner-consumer traversals T06-T11, T13, T15-T20 (ANX-305). T12/T14 in KERNEL entries. */
export const GRAPH_OWNER_CONSUMER_TRAVERSAL_ENTRIES = [
	{
		traversalId: TRAVERSAL_T06_META.traversalId,
		queryVersion: TRAVERSAL_T06_META.queryVersion,
		class: TRAVERSAL_T06_META.class,
		edgeAllowlist: ["HAS_SUBGOAL", "ADVANCES_GOAL", "DEPENDS_ON_TASK"],
		inputSchemaRef: "graph/traversals/T06.input.json",
		outputSchemaRef: "graph/traversals/T06.output.json",
		maxDepth: 12,
		maxVisited: 256,
		cacheable: TRAVERSAL_T06_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T07_META.traversalId,
		queryVersion: TRAVERSAL_T07_META.queryVersion,
		class: TRAVERSAL_T07_META.class,
		edgeAllowlist: ["MANAGED_BY", "FROM_CAPITAL_ACCOUNT", "HAS_DEPLOYMENT", "EXECUTED_BY_AGENT"],
		inputSchemaRef: "graph/traversals/T07.input.json",
		outputSchemaRef: "graph/traversals/T07.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T07_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T08_META.traversalId,
		queryVersion: TRAVERSAL_T08_META.queryVersion,
		class: TRAVERSAL_T08_META.class,
		edgeAllowlist: ["HAS_DEPLOYMENT", "USES_STRATEGY_VERSION", "EXECUTED_BY_AGENT", "MATERIALIZES_ORDER"],
		inputSchemaRef: "graph/traversals/T08.input.json",
		outputSchemaRef: "graph/traversals/T08.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T08_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T09_META.traversalId,
		queryVersion: TRAVERSAL_T09_META.queryVersion,
		class: TRAVERSAL_T09_META.class,
		edgeAllowlist: ["ON_INSTRUMENT", "REPRESENTS_ASSET", "HAS_DEPLOYMENT"],
		inputSchemaRef: "graph/traversals/T09.input.json",
		outputSchemaRef: "graph/traversals/T09.output.json",
		maxDepth: 6,
		maxVisited: 256,
		cacheable: TRAVERSAL_T09_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T10_META.traversalId,
		queryVersion: TRAVERSAL_T10_META.queryVersion,
		class: TRAVERSAL_T10_META.class,
		edgeAllowlist: ["MADE_BY", "BASED_ON", "USES_CONTEXT", "USES_INFERENCE", "USES_STRATEGY_VERSION"],
		inputSchemaRef: "graph/traversals/T10.input.json",
		outputSchemaRef: "graph/traversals/T10.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T10_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T11_META.traversalId,
		queryVersion: TRAVERSAL_T11_META.queryVersion,
		class: TRAVERSAL_T11_META.class,
		edgeAllowlist: ["FILLED_AS", "MATERIALIZES_ORDER", "CHECKED_BY", "FOR_INTENT", "PROPOSES_INTENT"],
		inputSchemaRef: "graph/traversals/T11.input.json",
		outputSchemaRef: "graph/traversals/T11.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T11_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T13_META.traversalId,
		queryVersion: TRAVERSAL_T13_META.queryVersion,
		class: TRAVERSAL_T13_META.class,
		edgeAllowlist: ["ASSIGNED_TO", "HAS_DEPLOYMENT", "PURSUES_GOAL"],
		inputSchemaRef: "graph/traversals/T13.input.json",
		outputSchemaRef: "graph/traversals/T13.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T13_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T15_META.traversalId,
		queryVersion: TRAVERSAL_T15_META.queryVersion,
		class: TRAVERSAL_T15_META.class,
		edgeAllowlist: ["HAS_MODEL_BINDING", "SELECTS_MODEL", "PERMITS_OFFERING", "SERVED_VIA"],
		inputSchemaRef: "graph/traversals/T15.input.json",
		outputSchemaRef: "graph/traversals/T15.output.json",
		maxDepth: 6,
		maxVisited: 128,
		cacheable: TRAVERSAL_T15_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T16_META.traversalId,
		queryVersion: TRAVERSAL_T16_META.queryVersion,
		class: TRAVERSAL_T16_META.class,
		edgeAllowlist: ["HAS_ROUTING_DECISION", "HAS_INFERENCE_ATTEMPT", "ATTEMPTED_VIA"],
		inputSchemaRef: "graph/traversals/T16.input.json",
		outputSchemaRef: "graph/traversals/T16.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T16_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T17_META.traversalId,
		queryVersion: TRAVERSAL_T17_META.queryVersion,
		class: TRAVERSAL_T17_META.class,
		edgeAllowlist: ["GENERATED_USAGE", "HAS_INFERENCE_ATTEMPT", "CHARGED_TO"],
		inputSchemaRef: "graph/traversals/T17.input.json",
		outputSchemaRef: "graph/traversals/T17.output.json",
		maxDepth: 8,
		maxVisited: 256,
		cacheable: TRAVERSAL_T17_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T18_META.traversalId,
		queryVersion: TRAVERSAL_T18_META.queryVersion,
		class: TRAVERSAL_T18_META.class,
		edgeAllowlist: ["RECONCILES_RESOURCE", "POSTS_LEDGER"],
		inputSchemaRef: "graph/traversals/T18.input.json",
		outputSchemaRef: "graph/traversals/T18.output.json",
		maxDepth: 6,
		maxVisited: 128,
		cacheable: TRAVERSAL_T18_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T19_META.traversalId,
		queryVersion: TRAVERSAL_T19_META.queryVersion,
		class: TRAVERSAL_T19_META.class,
		edgeAllowlist: ["USES_SNAPSHOT", "TESTS_CHANGE", "CHANGES_RESOURCE"],
		inputSchemaRef: "graph/traversals/T19.input.json",
		outputSchemaRef: "graph/traversals/T19.output.json",
		maxDepth: 6,
		maxVisited: 128,
		cacheable: TRAVERSAL_T19_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
	{
		traversalId: TRAVERSAL_T20_META.traversalId,
		queryVersion: TRAVERSAL_T20_META.queryVersion,
		class: TRAVERSAL_T20_META.class,
		edgeAllowlist: ["ATTRIBUTED_TO", "EARNED_FROM", "SETTLES_COMMISSION"],
		inputSchemaRef: "graph/traversals/T20.input.json",
		outputSchemaRef: "graph/traversals/T20.output.json",
		maxDepth: 6,
		maxVisited: 128,
		cacheable: TRAVERSAL_T20_META.cacheable,
		fixtureVersion: "owner-consumer-p3",
	},
];

export function createTraversalCatalog(
	registry: GraphSchemaRegistry,
	entries: readonly TraversalCatalogEntry[],
): TraversalCatalog {
	const index = new Map();
	for (const entry of entries) {
		registry.validateEdgeAllowlist(entry.edgeAllowlist);
		index.set(traversalKey(entry.traversalId, entry.queryVersion), entry);
	}
	const requireTraversal = (traversalId, queryVersion) => {
		const entry = index.get(traversalKey(traversalId, queryVersion));
		if (!entry) {
			throw new GraphSchemaRegistryError(
				"TRAVERSAL_NOT_REGISTERED",
				`Traversal not registered: ${traversalId}@${queryVersion}`,
			);
		}
		return entry;
	};
	return {
		getTraversal(traversalId, queryVersion) {
			return index.get(traversalKey(traversalId, queryVersion));
		},
		requireTraversal,
		listTraversals() {
			return [...index.values()];
		},
	};
}

export type TraversalClass = "kernel" | "hybrid" | "domain";

export type TraversalCacheable = "never" | "conditional" | "always";

export interface TraversalCatalogEntry {
	traversalId: string;
	queryVersion: number;
	class: TraversalClass;
	edgeAllowlist: readonly string[];
	inputSchemaRef: string;
	outputSchemaRef: string;
	maxDepth: number;
	maxVisited: number;
	cacheable: TraversalCacheable;
	fixtureVersion: string;
}

export interface TraversalCatalog {
	getTraversal(
		traversalId: string,
		queryVersion: number,
	): TraversalCatalogEntry | undefined;
	requireTraversal(
		traversalId: string,
		queryVersion: number,
	): TraversalCatalogEntry;
	listTraversals(): TraversalCatalogEntry[];
}
/** F0 authorization traversals — edge allowlist ⊆ GRAPH_F0_EDGE_TYPES. */
