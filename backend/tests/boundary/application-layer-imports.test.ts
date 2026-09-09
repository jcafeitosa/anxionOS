import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readdirSync, statSync } from "node:fs";
import {
	BACKEND_ROOT,
	collectModuleLayerFiles,
	findForbiddenImports,
	formatViolations,
	type ForbiddenPattern,
	type ImportViolation,
} from "./scan-imports";

/**
 * AR01 — ADR0002 layer rule: application must use domain ports, not infrastructure.
 * Complements domain-layer checks in module-layer-imports.test.ts (A3 / ANX-128).
 */
export const MODULE_APPLICATION_LAYER_FORBIDDEN: ForbiddenPattern[] = [
	{
		id: "application-no-infrastructure-relative",
		description: "module application must not import sibling infrastructure layer",
		filePath: /^modules\/[^/]+\/(src|dist)\/application\//,
		importPatterns: [
			/\.\.\/infrastructure/,
			/\.\.\/\.\.\/infrastructure/,
			/\/infrastructure\//,
		],
	},
	{
		id: "application-no-frameworks",
		description:
			"module application must not import ORM, HTTP framework or messaging drivers",
		filePath: /^modules\/[^/]+\/(src|dist)\/application\//,
		importPatterns: [
			/^neo4j-driver/,
			/^nats$/,
			/^nats\//,
			/drizzle-orm/,
			/^elysia/,
			/^better-auth/,
			/^pg$/,
			/^pg\//,
		],
	},
	{
		id: "application-no-apps",
		description: "module application must not import apps composition roots",
		filePath: /^modules\/[^/]+\/(src|dist)\/application\//,
		importPatterns: [/^apps\//, /@anxionos\/api/, /@anxionos\/workers/],
	},
	{
		id: "application-no-infra-packages",
		description:
			"module application must not import database/eventing packages directly",
		filePath: /^modules\/[^/]+\/(src|dist)\/application\//,
		importPatterns: [/@anxionos\/database/, /@anxionos\/eventing/],
	},
	{
		id: "application-no-cross-module-infra",
		description:
			"module application must not deep-import another module's infrastructure",
		filePath: /^modules\/[^/]+\/(src|dist)\/application\//,
		importPatterns: [
			/@anxionos\/[^/]+\/.*\/infrastructure/,
			/modules\/[^/]+\/(src|dist)\/infrastructure/,
		],
	},
];


function listModuleNamesWithApplication(backendRoot = BACKEND_ROOT): string[] {
	const modulesDir = join(backendRoot, "modules");
	return readdirSync(modulesDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
		.map((entry) => entry.name)
		.filter((name) => {
			const srcApplication = join(modulesDir, name, "src", "application");
			const distApplication = join(modulesDir, name, "dist", "application");
			return (
				statSync(srcApplication, { throwIfNoEntry: false })?.isDirectory() ||
				statSync(distApplication, { throwIfNoEntry: false })?.isDirectory()
			);
		});
}

export function collectApplicationLayerViolations(
	backendRoot = BACKEND_ROOT,
): ImportViolation[] {
	const violations: ImportViolation[] = [];
	for (const moduleName of listModuleNamesWithApplication(backendRoot)) {
		const files = collectModuleLayerFiles(
			moduleName,
			["application"],
			backendRoot,
		);
		if (files.length === 0) {
			continue;
		}
		violations.push(
			...findForbiddenImports(
				files,
				MODULE_APPLICATION_LAYER_FORBIDDEN,
				backendRoot,
			),
		);
	}
	return violations;
}

describe("AR01 application-layer-imports (ADR0002)", () => {
	test("fixture detects relative infrastructure import in application layer", () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "boundary-app-layer-"));
		const applicationDir = join(
			tempRoot,
			"modules",
			"fixture",
			"src",
			"application",
			"commands",
		);
		mkdirSync(applicationDir, { recursive: true });

		const invalidFile = join(applicationDir, "bad-command.ts");
		writeFileSync(
			invalidFile,
			'import { repo } from "../../infrastructure/persistence/schema";\nexport {};\n',
		);

		const violations = findForbiddenImports(
			[invalidFile],
			MODULE_APPLICATION_LAYER_FORBIDDEN,
			tempRoot,
		);

		expect(violations).toHaveLength(1);
		expect(violations[0]?.ruleId).toBe(
			"application-no-infrastructure-relative",
		);

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("fixture detects drizzle-orm import in application layer", () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "boundary-app-layer-"));
		const applicationDir = join(
			tempRoot,
			"modules",
			"fixture",
			"src",
			"application",
		);
		mkdirSync(applicationDir, { recursive: true });

		const invalidFile = join(applicationDir, "bad-use-case.ts");
		writeFileSync(
			invalidFile,
			'import { drizzle } from "drizzle-orm/node-postgres";\nexport {};\n',
		);

		const violations = findForbiddenImports(
			[invalidFile],
			MODULE_APPLICATION_LAYER_FORBIDDEN,
			tempRoot,
		);

		expect(violations).toHaveLength(1);
		expect(violations[0]?.ruleId).toBe("application-no-frameworks");

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("fixture allows domain port imports in application layer", () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "boundary-app-layer-"));
		const applicationDir = join(
			tempRoot,
			"modules",
			"fixture",
			"src",
			"application",
		);
		mkdirSync(applicationDir, { recursive: true });

		const validFile = join(applicationDir, "good-use-case.ts");
		writeFileSync(
			validFile,
			'import type { PrincipalRepository } from "../domain/ports/principal-repository";\nimport type { DomainEvent } from "@anxionos/contracts";\nexport type Deps = { repository: PrincipalRepository };\n',
		);

		const violations = findForbiddenImports(
			[validFile],
			MODULE_APPLICATION_LAYER_FORBIDDEN,
			tempRoot,
		);
		expect(violations).toEqual([]);

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("every module application layer avoids infrastructure and framework imports", () => {
		const moduleNames = listModuleNamesWithApplication(BACKEND_ROOT);
		expect(moduleNames.length).toBeGreaterThan(0);

		const violations = collectApplicationLayerViolations(BACKEND_ROOT);
		expect(violations).toEqual([]);
		if (violations.length > 0) {
			throw new Error(formatViolations(violations));
		}
	});
});
