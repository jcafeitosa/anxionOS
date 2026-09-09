import { describe, expect, test } from "bun:test";
import {
	BACKEND_ROOT,
	collectAllModuleFiles,
	collectModuleLayerFiles,
	findForbiddenImports,
	formatViolations,
	type ForbiddenPattern,
} from "./scan-imports";

/**
 * AR01 — graph module boundaries (R09 graph dev-plan §AR01).
 * Proíbe imports cross-module para infra privada do graph e frameworks no domain.
 */
export const GRAPH_CROSS_MODULE_FORBIDDEN: ForbiddenPattern[] = [
	{
		id: "no-graph-neo4j-adapter",
		description:
			"Non-graph modules must not import graph Neo4j adapter internals",
		filePath: /^modules\/(?!graph\/)/,
		importPatterns: [
			/graph\/infrastructure\/adapters\/neo4j/,
			/@anxionos\/graph\/.*\/infrastructure\/adapters\/neo4j/,
		],
	},
	{
		id: "no-graph-private-infra",
		description: "Non-graph modules must not deep-import graph infrastructure",
		filePath: /^modules\/(?!graph\/)/,
		importPatterns: [
			/@anxionos\/graph\/.*\/infrastructure/,
			/graph\/infrastructure\//,
			/modules\/graph\/src\/infrastructure/,
			/modules\/graph\/dist\/infrastructure/,
		],
	},
	{
		id: "no-graph-schema-outside-owner",
		description:
			"Only graph module may import graph persistence schema (graph_* tables)",
		filePath: /^modules\/(?!graph\/)/,
		importPatterns: [
			/@anxionos\/graph\/.*\/persistence\/schema/,
			/graph\/infrastructure\/persistence\/schema/,
		],
	},
];

export const GRAPH_DOMAIN_APP_FORBIDDEN: ForbiddenPattern[] = [
	{
		id: "graph-domain-no-frameworks",
		description:
			"graph/domain must not import NATS, Neo4j, Drizzle or other infrastructure",
		filePath: /^modules\/graph\/(src|dist)\/domain\//,
		importPatterns: [
			/^neo4j-driver/,
			/^nats$/,
			/^nats\//,
			/drizzle-orm/,
			/^elysia/,
			/@anxionos\/database/,
			/@anxionos\/eventing/,
			/\.\.\/infrastructure/,
			/\.\.\/\.\.\/infrastructure/,
		],
	},
	{
		id: "graph-domain-no-apps",
		description: "graph/domain must not import composition roots (apps)",
		filePath: /^modules\/graph\/(src|dist)\/domain\//,
		importPatterns: [/^apps\//, /@anxionos\/api/],
	},
];

describe("AR01 graph-imports", () => {
	test("non-graph modules do not import graph private infrastructure", () => {
		const files = collectAllModuleFiles(BACKEND_ROOT);
		expect(files.length).toBeGreaterThan(0);

		const violations = findForbiddenImports(
			files,
			GRAPH_CROSS_MODULE_FORBIDDEN,
			BACKEND_ROOT,
		);
		expect(violations).toEqual([]);
		if (violations.length > 0) {
			throw new Error(formatViolations(violations));
		}
	});

	test("graph/domain does not import apps or infrastructure frameworks", () => {
		const files = collectModuleLayerFiles("graph", ["domain"], BACKEND_ROOT);
		expect(files.length).toBeGreaterThan(0);

		const violations = findForbiddenImports(
			files,
			GRAPH_DOMAIN_APP_FORBIDDEN,
			BACKEND_ROOT,
		);
		expect(violations).toEqual([]);
		if (violations.length > 0) {
			throw new Error(formatViolations(violations));
		}
	});
});
