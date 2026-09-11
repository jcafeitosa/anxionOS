import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Full identity DDL assembled from the versioned migration files, so test
 * harnesses and production bootstrap can never drift apart. Migration files are
 * ordered by name (`0000_`, `0001_`, …) and each one is individually idempotent.
 */
const migrationsFolder = join(
	dirname(fileURLToPath(import.meta.url)),
	"migrations",
);

export const IDENTITY_MIGRATION_FILES: string[] = readdirSync(migrationsFolder)
	.filter((entry) => entry.endsWith(".sql"))
	.sort();

export const IDENTITY_DDL: string = IDENTITY_MIGRATION_FILES.map((file) =>
	readFileSync(join(migrationsFolder, file), "utf8"),
).join("\n");
