/**
 * ANX-268 — Agent Graph registry: 100% permanent personas → AgentRole nodes.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { PERSONAS, PERSONA_SLUGS } from "../agent-dialogue/personas.mjs";
import {
	buildAgentRoleRegistry,
	readRegistry,
} from "../agent-graph/build-agent-role-registry.mjs";

test("buildAgentRoleRegistry maps all 18 permanent personas", () => {
	const registry = buildAgentRoleRegistry(PERSONAS);
	assert.equal(registry.nodes.length, 18);
	assert.equal(registry.nodes.length, PERSONA_SLUGS.length);

	for (const slug of PERSONA_SLUGS) {
		const node = registry.nodes.find((n) => n.roleName === slug);
		assert.ok(node, `missing AgentRole node for ${slug}`);
		assert.equal(node.type, "AgentRole");
		assert.equal(node.personasMdSlug, slug);
		assert.ok(node.id === `agent:${slug}`);
	}
});

test("all permanent personas have coverageStatus covered", () => {
	const registry = buildAgentRoleRegistry(PERSONAS);
	for (const node of registry.nodes) {
		assert.equal(
			node.coverageStatus,
			"covered",
			`${node.roleName} must be covered (workflow exists)`,
		);
		assert.ok(
			existsSync(join(process.cwd(), node.workflowPath)),
			`workflow missing for ${node.roleName}`,
		);
	}
});

test("persisted registry matches live roster", () => {
	const built = buildAgentRoleRegistry(PERSONAS);
	const persisted = readRegistry();
	assert.equal(persisted.nodes.length, built.nodes.length);
	assert.equal(persisted.schemaVersion, "agent-role-registry.v1");

	const persistedSlugs = persisted.nodes.map((n) => n.roleName).sort();
	const builtSlugs = built.nodes.map((n) => n.roleName).sort();
	assert.deepEqual(persistedSlugs, builtSlugs);
});
