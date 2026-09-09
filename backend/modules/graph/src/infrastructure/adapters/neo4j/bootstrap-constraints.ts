import type { Driver } from "neo4j-driver";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONSTRAINTS_FILE = "constraints-v1.cypher";
function parseCypherStatements(source) {
    return source
        .split(";")
        .map((chunk) => chunk
        .split("\n")
        .filter((line) => !line.trim().startsWith("//"))
        .join("\n")
        .trim())
        .filter((statement) => statement.length > 0);
}
export async function loadNeo4jConstraintStatements() {
    const moduleDir = dirname(fileURLToPath(import.meta.url));
    const source = await readFile(join(moduleDir, CONSTRAINTS_FILE), "utf8");
    return parseCypherStatements(source);
}
/** Applies versioned Neo4j constraints/indexes idempotently (R09/R10 bootstrap). */
export async function ensureNeo4jGraphConstraints(driver) {
    const statements = await loadNeo4jConstraintStatements();
    const session = driver.session();
    try {
        for (const statement of statements) {
            await session.run(statement);
        }
    }
    finally {
        await session.close();
    }
}
