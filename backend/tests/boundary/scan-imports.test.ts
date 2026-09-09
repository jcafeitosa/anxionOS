import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	collectTsFiles,
	findForbiddenImports,
	type ForbiddenPattern,
} from "./scan-imports";

const FIXTURE_RULES: ForbiddenPattern[] = [
	{
		id: "fixture-no-drizzle",
		description: "fixture domain must not import drizzle-orm",
		filePath: /^modules\/fixture\/src\/domain\//,
		importPatterns: [/drizzle-orm/],
	},
];

describe("scan-imports fixtures", () => {
	let tempRoot: string;

	test("collectTsFiles skips dist and node_modules", () => {
		tempRoot = mkdtempSync(join(tmpdir(), "boundary-scan-"));
		mkdirSync(join(tempRoot, "src", "domain"), { recursive: true });
		mkdirSync(join(tempRoot, "dist", "domain"), { recursive: true });
		mkdirSync(join(tempRoot, "node_modules", "pkg"), { recursive: true });

		writeFileSync(join(tempRoot, "src", "domain", "ok.ts"), "export {};\n");
		writeFileSync(join(tempRoot, "dist", "domain", "skip.js"), "export {};\n");
		writeFileSync(
			join(tempRoot, "node_modules", "pkg", "skip.ts"),
			"export {};\n",
		);

		const files = collectTsFiles(join(tempRoot, "src"));
		expect(files).toHaveLength(1);
		expect(files[0]).toEndWith("src/domain/ok.ts");

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("findForbiddenImports detects negative fixture import", () => {
		tempRoot = mkdtempSync(join(tmpdir(), "boundary-scan-"));
		const domainDir = join(
			tempRoot,
			"modules",
			"fixture",
			"src",
			"domain",
		);
		mkdirSync(domainDir, { recursive: true });

		const validFile = join(domainDir, "valid.ts");
		const invalidFile = join(domainDir, "invalid.ts");
		writeFileSync(validFile, 'import { x } from "@anxionos/contracts";\n');
		writeFileSync(
			invalidFile,
			'import { pgTable } from "drizzle-orm/pg-core";\n',
		);

		const violations = findForbiddenImports(
			[validFile, invalidFile],
			FIXTURE_RULES,
			tempRoot,
		);

		expect(violations).toHaveLength(1);
		expect(violations[0]?.ruleId).toBe("fixture-no-drizzle");
		expect(violations[0]?.importSpecifier).toContain("drizzle-orm");

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("findForbiddenImports passes positive fixture import", () => {
		tempRoot = mkdtempSync(join(tmpdir(), "boundary-scan-"));
		const domainDir = join(
			tempRoot,
			"modules",
			"fixture",
			"src",
			"domain",
		);
		mkdirSync(domainDir, { recursive: true });

		const validFile = join(domainDir, "ports.ts");
		writeFileSync(
			validFile,
			'import type { DomainEvent } from "@anxionos/contracts";\nexport type Port = { emit: (e: DomainEvent) => void };\n',
		);

		const violations = findForbiddenImports(
			[validFile],
			FIXTURE_RULES,
			tempRoot,
		);
		expect(violations).toEqual([]);

		rmSync(tempRoot, { recursive: true, force: true });
	});
});
