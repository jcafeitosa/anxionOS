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

/** Static import/export-from (supports multiline bindings before `from`). */
const STATIC_IMPORT_EXPORT_RE =
	/(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,$]*?\sfrom\s+)?["']([^"']+)["']/gs;
/** Side-effect static import without `from`. */
const SIDE_EFFECT_IMPORT_RE = /import\s+["']([^"']+)["']/gs;
/** Dynamic `import("…")` (also `await import("…")`). */
const DYNAMIC_IMPORT_RE = /import\s*\(\s*["']([^"']+)["']\s*\)/gs;
const REQUIRE_RE = /require\s*\(\s*["']([^"']+)["']\s*\)/gs;

const SOURCE_SCAN_PATTERNS: ReadonlyArray<{
	pattern: RegExp;
	kind: "static" | "dynamic" | "require";
}> = [
	{ pattern: STATIC_IMPORT_EXPORT_RE, kind: "static" },
	{ pattern: SIDE_EFFECT_IMPORT_RE, kind: "static" },
	{ pattern: DYNAMIC_IMPORT_RE, kind: "dynamic" },
	{ pattern: REQUIRE_RE, kind: "require" },
];

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

export type ExtractedImport = {
	specifier: string;
	line: number;
	kind: "static" | "dynamic" | "require";
};

/**
 * Extract module specifiers from a TypeScript source file.
 * Operates on the full file so multiline imports and export-from re-exports are visible.
 */
export function extractImportsFromSource(source: string): ExtractedImport[] {
	const results: ExtractedImport[] = [];
	const seen = new Set<string>();

	for (const { pattern, kind } of SOURCE_SCAN_PATTERNS) {
		pattern.lastIndex = 0;
		let match = pattern.exec(source);
		while (match !== null) {
			const specifier = match[1];
			const line = source.slice(0, match.index).split("\n").length;
			const dedupeKey = `${line}:${kind}:${specifier}`;
			if (!seen.has(dedupeKey)) {
				seen.add(dedupeKey);
				results.push({ specifier, line, kind });
			}
			match = pattern.exec(source);
		}
	}

	return results;
}

/**
 * Statically detect forbidden import specifiers for the given rules.
 *
 * **Coverage:** full-file regex scan for static `import`/`export … from`, side-effect
 * imports, dynamic `import("…")`, and CommonJS `require("…")`. Multiline binding lists
 * before `from "…"` are supported via the `s` (dotAll) flag.
 *
 * **Remaining limits:** template-literal specifiers, computed/dynamic non-literal paths,
 * string concatenation, and imports injected only at build time are not detected.
 * When a module has no `src/` tree, `collectModuleLayerFiles` falls back to compiled
 * `dist/` output, which preserves resolved single-line imports for shipped JS bundles.
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

		const source = readFileSync(absolutePath, "utf8");
		for (const { specifier, line } of extractImportsFromSource(source)) {
			for (const rule of applicableRules) {
				if (rule.importPatterns.some((pattern) => pattern.test(specifier))) {
					violations.push({
						file: relPath,
						line,
						importSpecifier: specifier,
						ruleId: rule.id,
						description: rule.description,
					});
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
