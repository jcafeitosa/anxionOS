import { describe, expect, test } from "bun:test";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
	BACKEND_ROOT,
	collectModuleLayerFiles,
	findForbiddenImports,
	formatViolations,
	type ForbiddenPattern,
} from "./scan-imports";

/**
 * AR01 — ADR0002 layer rule: domain must not import infrastructure or frameworks.
 * Applies to every module under backend/modules/*.
 */
export const MODULE_DOMAIN_LAYER_FORBIDDEN: ForbiddenPattern[] = [
	{
		id: "domain-no-infrastructure-relative",
		description: "module domain must not import sibling infrastructure layer",
		filePath: /^modules\/[^/]+\/(src|dist)\/domain\//,
		importPatterns: [
			/\.\.\/infrastructure/,
			/\.\.\/\.\.\/infrastructure/,
			/\/infrastructure\//,
		],
	},
	{
		id: "domain-no-frameworks",
		description:
			"module domain must not import ORM, HTTP framework or messaging drivers",
		filePath: /^modules\/[^/]+\/(src|dist)\/domain\//,
		importPatterns: [
			/^neo4j-driver/,
			/^nats$/,
			/^nats\//,
			/drizzle-orm/,
			/^elysia/,
			/^better-auth/,
		],
	},
	{
		id: "domain-no-apps",
		description: "module domain must not import apps composition roots",
		filePath: /^modules\/[^/]+\/(src|dist)\/domain\//,
		importPatterns: [/^apps\//, /@anxionos\/api/, /@anxionos\/workers/],
	},
	{
		id: "domain-no-infra-packages",
		description:
			"module domain must not import database/eventing packages directly",
		filePath: /^modules\/[^/]+\/(src|dist)\/domain\//,
		importPatterns: [/@anxionos\/database/, /@anxionos\/eventing/],
	},
];

function listModuleNames(backendRoot = BACKEND_ROOT): string[] {
	const modulesDir = join(backendRoot, "modules");
	return readdirSync(modulesDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name)
		.filter((name) => {
			const srcDomain = join(modulesDir, name, "src", "domain");
			const distDomain = join(modulesDir, name, "dist", "domain");
			return (
				statSync(srcDomain, { throwIfNoEntry: false })?.isDirectory() ||
				statSync(distDomain, { throwIfNoEntry: false })?.isDirectory()
			);
		});
}

describe("AR01 module-layer-imports (ADR0002)", () => {
	test("every module domain layer avoids infrastructure and framework imports", () => {
		const moduleNames = listModuleNames(BACKEND_ROOT);
		expect(moduleNames.length).toBeGreaterThan(0);

		const allViolations: ReturnType<typeof findForbiddenImports> = [];
		for (const moduleName of moduleNames) {
			const files = collectModuleLayerFiles(
				moduleName,
				["domain"],
				BACKEND_ROOT,
			);
			if (files.length === 0) {
				continue;
			}
			allViolations.push(
				...findForbiddenImports(
					files,
					MODULE_DOMAIN_LAYER_FORBIDDEN,
					BACKEND_ROOT,
				),
			);
		}

		expect(allViolations).toEqual([]);
		if (allViolations.length > 0) {
			throw new Error(formatViolations(allViolations));
		}
	});
});
