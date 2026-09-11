import type { EdgeTypeDef } from "./edge-types";
import type { NodeTypeDef } from "./node-types";

/** Performance Graph node types — ownerDomain `performance` (ANX-154 S5 / PERF-R05). */
export const PERFORMANCE_GRAPH_NODE_TYPES: readonly NodeTypeDef[] = [
	{
		nodeType: "PositionExposureSnapshot",
		schemaVersion: 1,
		ownerDomain: "performance",
		status: "active",
		payloadSchemaRef:
			"graph/schema/v1/performance/PositionExposureSnapshot.json",
		checksum: "sha256:performance-position-exposure-snapshot-v1",
	},
	{
		nodeType: "MetricSeries",
		schemaVersion: 1,
		ownerDomain: "performance",
		status: "active",
		payloadSchemaRef: "graph/schema/v1/performance/MetricSeries.json",
		checksum: "sha256:performance-metric-series-v1",
	},
];

/** Performance Graph edge types — snapshot → derived metric linkage. */
export const PERFORMANCE_GRAPH_EDGE_TYPES: readonly EdgeTypeDef[] = [
	{
		edgeTypeId: "performance.has_metric",
		edgeType: "HAS_METRIC",
		schemaVersion: 1,
		fromNodeTypes: ["Outcome", "PositionExposureSnapshot"],
		toNodeTypes: ["MetricSeries"],
		writerDomain: "performance",
		cardinality: "one-to-many",
		temporal: true,
		crossScopePolicy: "same-scope",
		status: "active",
	},
];
