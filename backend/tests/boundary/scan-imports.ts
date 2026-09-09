import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Backend workspace root (`backend/`). */
export const BACKEND_ROOT = join(import.meta.dir, "..", "..");

const SKIP_DIR_NAMES = new Set([
	"node_modules",
	"dist",
	"graphify-out",
	"fixtures",
]);

export type ForbiddenPattern = {
	id: string;
	description: string;
	/** Relative path from backend root (posix slashes). */
	filePath: RegExp;
	importPatterns: RegExp[];
};

export type ImportViolation = {
	file: string;
	line: number;
	importSpecifier: string;
	ruleId: string;
	description: string;
};

const IMPORT_LINE_RE =
	/(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]+from\s+)?["']([^"']+)["']/g;
const REQUIRE_LINE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/g;

function toPosixPath(filePath: string): string {
	return filePath.split("\\").join("/");
}

function shouldSkipDir(name: string): boolean {
	return SKIP_DIR_NAMES.has(name);
}

/**
 * Recursively collect TypeScript sources under a directory.
 * Skips build artifacts and dependency folders.
 */
export function collectTsFiles(rootDir: string): string[] {
	const results: string[] = [];

	function walk(dir: string): void {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (shouldSkipDir(entry.name)) {
					continue;
				}
				walk(join(dir, entry.name));
				continue;
			}

			if (
				entry.name.endsWith(".ts") &&
				!entry.name.endsWith(".d.ts") &&
				!entry.name.endsWith(".test.ts")
			) {
				results.push(join(dir, entry.name));
			}
		}
	}

	if (!statSync(rootDir, { throwIfNoEntry: false })?.isDirectory()) {
		return results;
	}

	walk(rootDir);

	return results;
}

/**
 * Collect module layer sources for AR01 scans.
 * Prefers `modules/<name>/src`; falls back to compiled `dist` when src is absent.
 */
export function collectModuleLayerFiles(
	moduleName: string,
	layers: readonly ("domain" | "application")[],
	backendRoot = BACKEND_ROOT,
): string[] {
	const moduleRoot = join(backendRoot, "modules", moduleName);
	const srcRoot = join(moduleRoot, "src");
	const distRoot = join(moduleRoot, "dist");

	const srcFiles = layers.flatMap((layer) =>
		collectTsFiles(join(srcRoot, layer)),
	);
	if (srcFiles.length > 0) {
		return srcFiles;
	}

	const distFiles: string[] = [];
	for (const layer of layers) {
		const layerDir = join(distRoot, layer);
		if (!statSync(layerDir, { throwIfNoEntry: false })?.isDirectory()) {
			continue;
		}
		for (const entry of readdirSync(layerDir, {
			recursive: true,
			withFileTypes: true,
		})) {
			if (!entry.isFile() || !entry.name.endsWith(".js")) {
				continue;
			}
			const parent = entry.parentPath ?? entry.path;
			distFiles.push(join(parent, entry.name));
		}
	}
	return distFiles;
}

/**
 * Collect all module sources under `modules/` for cross-module scans.
 */
export function collectAllModuleFiles(
	backendRoot = BACKEND_ROOT,
): string[] {
	const modulesDir = join(backendRoot, "modules");
	const files: string[] = [];

	for (const entry of readdirSync(modulesDir, { withFileTypes: true })) {
		if (!entry.isDirectory() || shouldSkipDir(entry.name)) {
			continue;
		}
		const srcDir = join(modulesDir, entry.name, "src");
		const srcFiles = collectTsFiles(srcDir);
		if (srcFiles.length > 0) {
			files.push(...srcFiles);
			continue;
		}

		const distDir = join(modulesDir, entry.name, "dist");
		if (!statSync(distDir, { throwIfNoEntry: false })?.isDirectory()) {
			continue;
		}
		for (const fileEntry of readdirSync(distDir, {
			recursive: true,
			withFileTypes: true,
		})) {
			if (!fileEntry.isFile() || !fileEntry.name.endsWith(".js")) {
				continue;
			}
			const parent = fileEntry.parentPath ?? fileEntry.path;
			files.push(join(parent, fileEntry.name));
		}
	}

	return files;
}

function extractImportSpecifiers(line: string): string[] {
	const specifiers: string[] = [];
	for (const pattern of [IMPORT_LINE_RE, REQUIRE_LINE_RE]) {
		pattern.lastIndex = 0;
		let match = pattern.exec(line);
		while (match !== null) {
			specifiers.push(match[1]);
			match = pattern.exec(line);
		}
	}
	return specifiers;
}

/**
 * Statically detect forbidden import specifiers for the given rules.
 *
 * **Limitation:** scanning is line-by-line via regex (`IMPORT_LINE_RE` / `REQUIRE_LINE_RE`).
 * Multiline `import` statements (specifier on a line without `from "…"`) are not detected.
 * When a module has no `src/` tree, `collectModuleLayerFiles` falls back to compiled `dist/`
 * output, which preserves resolved single-line imports for the current codebase and mitigates
 * most false negatives for production modules shipped as JS bundles.
 */
export function findForbiddenImports(
	files: readonly string[],
	rules: readonly ForbiddenPattern[],
	backendRoot = BACKEND_ROOT,
): ImportViolation[] {
	const violations: ImportViolation[] = [];

	for (const absolutePath of files) {
		const relPath = toPosixPath(relative(backendRoot, absolutePath));
		const applicableRules = rules.filter((rule) => rule.filePath.test(relPath));
		if (applicableRules.length === 0) {
			continue;
		}

		const lines = readFileSync(absolutePath, "utf8").split("\n");
		for (let index = 0; index < lines.length; index += 1) {
			const line = lines[index];
			if (!line.includes("import") && !line.includes("require")) {
				continue;
			}

			for (const specifier of extractImportSpecifiers(line)) {
				for (const rule of applicableRules) {
					if (rule.importPatterns.some((pattern) => pattern.test(specifier))) {
						violations.push({
							file: relPath,
							line: index + 1,
							importSpecifier: specifier,
							ruleId: rule.id,
							description: rule.description,
						});
					}
				}
			}
		}
	}

	return violations;
}

export function formatViolations(violations: readonly ImportViolation[]): string {
	if (violations.length === 0) {
		return "";
	}

	return violations
		.map(
			(v) =>
				`${v.file}:${v.line} [${v.ruleId}] ${v.importSpecifier} — ${v.description}`,
		)
		.join("\n");
}


/**
 * SQL migrations must live under the owning module infrastructure layer.
 * Accepts `infrastructure/migrations` or `infrastructure/persistence/migrations`.
 */
export const MODULE_MIGRATION_SQL_PATH =
	/^modules\/[^/]+\/(src|dist)\/infrastructure\/(migrations|persistence\/migrations)\/[^/]+\.sql$/;

/**
 * Recursively collect `.sql` files under a directory.
 */
export function collectSqlFiles(rootDir: string): string[] {
	const results: string[] = [];

	function walk(dir: string): void {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				if (shouldSkipDir(entry.name)) {
					continue;
				}
				walk(join(dir, entry.name));
				continue;
			}

			if (entry.name.endsWith(".sql")) {
				results.push(join(dir, entry.name));
			}
		}
	}

	if (!statSync(rootDir, { throwIfNoEntry: false })?.isDirectory()) {
		return results;
	}

	walk(rootDir);

	return results;
}

/**
 * Collect all SQL files under `backend/` (modules, apps, packages).
 */
export function collectBackendSqlFiles(backendRoot = BACKEND_ROOT): string[] {
	const roots = ["modules", "apps", "packages"] as const;
	const files: string[] = [];

	for (const segment of roots) {
		const root = join(backendRoot, segment);
		if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
			continue;
		}
		files.push(...collectSqlFiles(root));
	}

	return files;
}

export type MigrationOwnershipViolation = {
	file: string;
	reason: string;
};
