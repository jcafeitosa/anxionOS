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
 * AR01 — orchestration module boundaries (R09 orchestration dev-plan §AR01).
 */
export const ORCHESTRATION_CROSS_MODULE_FORBIDDEN: ForbiddenPattern[] = [
	{
		id: "no-identity-infra",
		description:
			"Modules must not import identity infrastructure (use public API only)",
		filePath: /^modules\//,
		importPatterns: [
			/@anxionos\/identity\/.*\/infrastructure/,
			/identity\/infrastructure\//,
			/modules\/identity\/src\/infrastructure/,
			/modules\/identity\/dist\/infrastructure/,
		],
	},
	{
		id: "no-organizations-infra",
		description:
			"Modules must not import organizations infrastructure (use public API only)",
		filePath: /^modules\//,
		importPatterns: [
			/@anxionos\/organizations\/.*\/infrastructure/,
			/organizations\/infrastructure\//,
			/modules\/organizations\/src\/infrastructure/,
			/modules\/organizations\/dist\/infrastructure/,
		],
	},
	{
		id: "no-governance-infra",
		description:
			"Modules must not import governance infrastructure (use public API only)",
		filePath: /^modules\//,
		importPatterns: [
			/@anxionos\/governance\/.*\/infrastructure/,
			/governance\/infrastructure\//,
			/modules\/governance\/src\/infrastructure/,
			/modules\/governance\/dist\/infrastructure/,
		],
	},
];

export const ORCHESTRATION_DOMAIN_APP_FORBIDDEN: ForbiddenPattern[] = [
	{
		id: "orchestration-domain-no-frameworks",
		description:
			"orchestration/domain must not import NATS, Neo4j, Drizzle or infrastructure",
		filePath: /^modules\/orchestration\/(src|dist)\/domain\//,
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
		id: "orchestration-domain-no-apps",
		description: "orchestration/domain must not import composition roots",
		filePath: /^modules\/orchestration\/(src|dist)\/domain\//,
		importPatterns: [/^apps\//, /@anxionos\/api/],
	},
	{
		id: "orchestration-domain-no-private-repos",
		description:
			"orchestration/domain must not import private cross-module repositories",
		filePath: /^modules\/orchestration\/(src|dist)\/domain\//,
		importPatterns: [
			/@anxionos\/identity\/.*\/infrastructure\/persistence/,
			/@anxionos\/organizations\/.*\/infrastructure\/persistence/,
			/@anxionos\/graph\/.*\/infrastructure/,
		],
	},
];

describe("AR01 orchestration-imports", () => {
	test("modules do not import identity/organizations/governance infrastructure", () => {
		const files = collectAllModuleFiles(BACKEND_ROOT);
		expect(files.length).toBeGreaterThan(0);

		const violations = findForbiddenImports(
			files,
			ORCHESTRATION_CROSS_MODULE_FORBIDDEN,
			BACKEND_ROOT,
		);
		expect(violations).toEqual([]);
		if (violations.length > 0) {
			throw new Error(formatViolations(violations));
		}
	});

	test("orchestration/domain does not import apps, frameworks or private repos", () => {
		const files = collectModuleLayerFiles(
			"orchestration",
			["domain"],
			BACKEND_ROOT,
		);
		expect(files.length).toBeGreaterThan(0);

		const violations = findForbiddenImports(
			files,
			ORCHESTRATION_DOMAIN_APP_FORBIDDEN,
			BACKEND_ROOT,
		);
		expect(violations).toEqual([]);
		if (violations.length > 0) {
			throw new Error(formatViolations(violations));
		}
	});
});
