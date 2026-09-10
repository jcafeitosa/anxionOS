import { describe, expect, test } from "bun:test";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readdirSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
	BACKEND_ROOT,
	MODULE_MIGRATION_SQL_PATH,
	type MigrationOwnershipViolation,
	collectBackendSqlFiles,
} from "./scan-imports";

const MIGRATE_FILE_RE =
	/^modules\/[^/]+\/(src|dist)\/infrastructure\/migrate\.(ts|js)$/;

function toPosixPath(filePath: string): string {
	return filePath.split("\\").join("/");
}

function findMigrationOwnershipViolations(
	backendRoot = BACKEND_ROOT,
): MigrationOwnershipViolation[] {
	const violations: MigrationOwnershipViolation[] = [];

	for (const absolutePath of collectBackendSqlFiles(backendRoot)) {
		const relPath = toPosixPath(relative(backendRoot, absolutePath));
		if (!MODULE_MIGRATION_SQL_PATH.test(relPath)) {
			violations.push({
				file: relPath,
				reason:
					"SQL migration must live under modules/<owner>/(src|dist)/infrastructure/(migrations|persistence/migrations)/",
			});
		}
	}

	const modulesDir = join(backendRoot, "modules");
	if (statSync(modulesDir, { throwIfNoEntry: false })?.isDirectory()) {
		for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
			if (!entry.isDirectory() || entry.name.startsWith(".")) {
				continue;
			}

			for (const layer of ["src", "dist"] as const) {
				const migratePath = join(
					modulesDir,
					entry.name,
					layer,
					"infrastructure",
					"migrate.ts",
				);
				const migrateJsPath = join(
					modulesDir,
					entry.name,
					layer,
					"infrastructure",
					"migrate.js",
				);

				const resolved = statSync(migratePath, {
					throwIfNoEntry: false,
				})?.isFile()
					? migratePath
					: statSync(migrateJsPath, { throwIfNoEntry: false })?.isFile()
						? migrateJsPath
						: null;

				if (!resolved) {
					continue;
				}

				const relPath = toPosixPath(relative(backendRoot, resolved));
				if (!MIGRATE_FILE_RE.test(relPath)) {
					violations.push({
						file: relPath,
						reason:
							"migrate entrypoint must live under modules/<owner>/(src|dist)/infrastructure/migrate.ts",
					});
					continue;
				}

				const source = readFileSync(resolved, "utf8");
				if (!source.includes("migrations")) {
					violations.push({
						file: relPath,
						reason: "migrate entrypoint must reference a migrations folder",
					});
				}

				if (
					/migrationsFolder\s*=\s*join\([^)]*packages\//.test(source) ||
					/migrationsFolder\s*=\s*join\([^)]*apps\//.test(source)
				) {
					violations.push({
						file: relPath,
						reason:
							"migrationsFolder must not point at packages/ or apps/ (owner is the module)",
					});
				}
			}
		}
	}

	return violations;
}

function formatMigrationViolations(
	violations: readonly MigrationOwnershipViolation[],
): string {
	return violations.map((v) => `${v.file} — ${v.reason}`).join("\n");
}

describe("AR01 migration-ownership (ADR0002)", () => {
	test("fixture rejects SQL migration outside module infrastructure", () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "boundary-migrations-"));
		const badSql = join(tempRoot, "packages", "database", "0001_bad.sql");
		mkdirSync(join(tempRoot, "packages", "database"), { recursive: true });
		writeFileSync(badSql, "-- bad placement\n");

		const relPath = toPosixPath(relative(tempRoot, badSql));
		expect(MODULE_MIGRATION_SQL_PATH.test(relPath)).toBe(false);

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("fixture accepts SQL migration under module infrastructure/migrations", () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "boundary-migrations-"));
		const goodSql = join(
			tempRoot,
			"modules",
			"identity",
			"src",
			"infrastructure",
			"migrations",
			"0001_init.sql",
		);
		mkdirSync(
			join(
				tempRoot,
				"modules",
				"identity",
				"src",
				"infrastructure",
				"migrations",
			),
			{ recursive: true },
		);
		writeFileSync(goodSql, "-- owned by identity\n");

		const relPath = toPosixPath(relative(tempRoot, goodSql));
		expect(MODULE_MIGRATION_SQL_PATH.test(relPath)).toBe(true);

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("fixture accepts SQL migration under infrastructure/persistence/migrations", () => {
		const tempRoot = mkdtempSync(join(tmpdir(), "boundary-migrations-"));
		const goodSql = join(
			tempRoot,
			"modules",
			"graph",
			"src",
			"infrastructure",
			"persistence",
			"migrations",
			"0001_graph.sql",
		);
		mkdirSync(
			join(
				tempRoot,
				"modules",
				"graph",
				"src",
				"infrastructure",
				"persistence",
				"migrations",
			),
			{ recursive: true },
		);
		writeFileSync(goodSql, "-- graph persistence migrations\n");

		const relPath = toPosixPath(relative(tempRoot, goodSql));
		expect(MODULE_MIGRATION_SQL_PATH.test(relPath)).toBe(true);

		rmSync(tempRoot, { recursive: true, force: true });
	});

	test("all SQL migrations and migrate entrypoints respect module ownership", () => {
		const violations = findMigrationOwnershipViolations(BACKEND_ROOT);
		expect(violations).toEqual([]);
		if (violations.length > 0) {
			throw new Error(formatMigrationViolations(violations));
		}
	});
});
