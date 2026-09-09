import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BACKEND_ROOT } from "./scan-imports";

/**
 * A3 alias/reexport coverage (ANX-128).
 *
 * Static import scanning (`scan-imports.ts`) resolves relative specifiers only.
 * Package aliases (`@anxionos/*`) and barrel re-exports are enforced by:
 * - `npm run boundaries` (dependency-cruiser `application-not-infra`, `domain-not-infra`)
 * - `application-no-cross-module-infra` in application-layer-imports.test.ts
 *
 * Module public `index` files may re-export infrastructure adapters for composition
 * roots (ADR0002 bootstrap); application layers must not consume those paths.
 */
describe("AR01 alias-reexport-boundaries (ANX-128)", () => {
	test("dependency-cruiser config blocks ORM drivers for application layer", () => {
		const configPath = join(BACKEND_ROOT, ".dependency-cruiser.cjs");
		const source = readFileSync(configPath, "utf8");
		expect(source).toContain("application-not-infra");
		expect(source).toContain("^modules/.+/application/");
		expect(source).toContain("node_modules/drizzle-orm");
		expect(source).toContain("node_modules/pg");
	});
});
