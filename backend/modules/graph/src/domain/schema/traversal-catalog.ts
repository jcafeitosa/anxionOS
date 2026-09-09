import type { GraphSchemaRegistry } from "./registry";
import { TRAVERSAL_T01_META, TRAVERSAL_T02_META, TRAVERSAL_T03_META, TRAVERSAL_T04_META, TRAVERSAL_T05_META, } from "@anxionos/contracts/graph";
import { GraphSchemaRegistryError } from "./errors";

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
export function createTraversalCatalog(registry: GraphSchemaRegistry, entries: readonly TraversalCatalogEntry[]): TraversalCatalog {
    const index = new Map();
    for (const entry of entries) {
        registry.validateEdgeAllowlist(entry.edgeAllowlist);
        index.set(traversalKey(entry.traversalId, entry.queryVersion), entry);
    }
    const requireTraversal = (traversalId, queryVersion) => {
        const entry = index.get(traversalKey(traversalId, queryVersion));
        if (!entry) {
            throw new GraphSchemaRegistryError("TRAVERSAL_NOT_REGISTERED", `Traversal not registered: ${traversalId}@${queryVersion}`);
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
    getTraversal(traversalId: string, queryVersion: number): TraversalCatalogEntry | undefined;
    requireTraversal(traversalId: string, queryVersion: number): TraversalCatalogEntry;
    listTraversals(): TraversalCatalogEntry[];
}
/** F0 authorization traversals — edge allowlist ⊆ GRAPH_F0_EDGE_TYPES. */
