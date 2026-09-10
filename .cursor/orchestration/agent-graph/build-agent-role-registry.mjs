/**
 * Build Agent Graph registry: PERSONAS roster → AgentRole nodes (P0).
 * ANX-268 — 100% permanent personas with coverageStatus.
 *
 * Usage:
 *   node build-agent-role-registry.mjs
 *   node build-agent-role-registry.mjs --check   # exit 1 if drift
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getPersonasPath } from "../agent-config/load-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = join(__dirname, "agent-role-registry.json");
const WORKFLOWS_DIR = join(__dirname, "..", "workflows");

const COVERAGE_ENUM = ["covered", "partial", "proposed"];

/**
 * @param {Record<string, object>} personas
 * @returns {{ schemaVersion: string, generatedAt: string, nodes: object[] }}
 */
export function buildAgentRoleRegistry(personas) {
	const nodes = Object.values(personas).map((persona) => {
		const slug = persona.slug;
		const workflowPath = `.cursor/orchestration/workflows/workflow-${slug}.md`;
		const workflowExists = existsSync(join(WORKFLOWS_DIR, `workflow-${slug}.md`));
		const coverageStatus = workflowExists ? "covered" : "partial";

		if (!COVERAGE_ENUM.includes(coverageStatus)) {
			throw new Error(`Invalid coverageStatus for ${slug}: ${coverageStatus}`);
		}

		return {
			id: `agent:${slug}`,
			type: "AgentRole",
			roleName: slug,
			coverageStatus,
			fullName: persona.fullName,
			team: persona.team,
			hierarchyLevel: persona.hierarchyLevel ?? "unknown",
			role: persona.role,
			personasMdSlug: slug,
			workflowPath,
			reportsTo: persona.reportsTo ?? null,
			criticSlug: persona.criticSlug ?? null,
			criticOf: persona.criticOf ?? null,
		};
	});

	nodes.sort((a, b) => a.roleName.localeCompare(b.roleName));

	return {
		schemaVersion: "agent-role-registry.v1",
		generatedAt: new Date().toISOString(),
		ownerDomain: "cursor-orchestration",
		source: "PERSONAS.md + roster JSON",
		nodes,
	};
}

function loadPersonasFromConfig() {
	const path = getPersonasPath();
	const raw = JSON.parse(readFileSync(path, "utf8"));
	return raw.personas ?? raw;
}

export function readRegistry() {
	return JSON.parse(readFileSync(REGISTRY_PATH, "utf8"));
}

function main() {
	const checkOnly = process.argv.includes("--check");
	const personas = loadPersonasFromConfig();
	const registry = buildAgentRoleRegistry(personas);

	if (checkOnly && existsSync(REGISTRY_PATH)) {
		const existing = readRegistry();
		const existingIds = existing.nodes.map((n) => n.id).sort().join(",");
		const newIds = registry.nodes.map((n) => n.id).sort().join(",");
		if (existingIds !== newIds) {
			console.error("Registry drift: node ids differ from roster");
			process.exit(1);
		}
	}

	writeFileSync(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

	const covered = registry.nodes.filter((n) => n.coverageStatus === "covered").length;
	console.log(
		`AgentRole registry: ${registry.nodes.length} nodes (${covered} covered) → ${REGISTRY_PATH}`,
	);

	if (covered !== registry.nodes.length) {
		console.error("Not all permanent personas are covered");
		process.exit(1);
	}
}

const isMain =
	process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
	main();
}
