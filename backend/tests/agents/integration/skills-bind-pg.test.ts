/**
 * ANX-143 — Postgres integration for skills lifecycle + bind (G3 parity ANX-323).
 * Skipped unless RUN_PG_INTEGRATION_TESTS=true and DATABASE_URL set.
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	bindAgentSkill,
	createSkillVersion,
	recordSkillVersionEvaluation,
	registerAgent,
	registerSkill,
	submitSkillVersion,
} from "@anxionos/agents";
import {
	createAgentsPgDeps,
	shouldRunPgIntegrationTests,
	withAgentsPgHarness,
} from "../test-support";

const instructionRef = {
	bucket: "agents-instructions",
	key: "org/test/instruction-v1.json",
	contentHash: "sha256:abc123",
};

const contentRef = {
	bucket: "skills",
	key: "org/test/skill-v1.md",
	contentHash: "sha256:skill-content",
};

const evaluationRef = {
	evaluationId: randomUUID(),
	rubricVersion: "rubric-v1",
	outcome: "pass" as const,
	evidenceHash: "sha256:evidence",
};

describe("agents skills lifecycle against real Postgres (ANX-143)", () => {
	test("register → version → submit → evaluate → bind persists rows and outbox", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withAgentsPgHarness(async ({ pool }) => {
			const deps = await createAgentsPgDeps(pool);
			const organizationId = randomUUID();
			const agencyId = organizationId;

			const agent = await registerAgent(deps, {
				commandId: randomUUID(),
				displayName: "Skills PG Agent",
				kind: "AGENCY",
				agencyId,
				organizationId,
			});

			const draftVersionId = randomUUID();
			const now = new Date();
			await deps.unitOfWork.runInTransaction(undefined, async (ctx) => {
				await ctx.agentVersionRepository.save({
					id: draftVersionId,
					agentId: agent.aggregateId,
					versionNumber: 1,
					status: "draft",
					instructionRef,
					skillRefs: [],
					capabilityManifestHash: "sha256:manifest-pg",
					modelSlots: [],
					autonomyLevel: "L1",
					createdAt: now,
				});
			});

			const skill = await registerSkill(deps, {
				commandId: randomUUID(),
				slug: `market-scan-${randomUUID().slice(0, 8)}`,
				displayName: "Market Scan",
				organizationId,
			});

			const skillVersion = await createSkillVersion(deps, {
				commandId: randomUUID(),
				skillId: skill.aggregateId,
				schemaVersion: "1.0.0",
				contentRef,
				contentHash: "sha256:skill-hash-pg",
			});

			await submitSkillVersion(deps, {
				commandId: randomUUID(),
				skillId: skill.aggregateId,
				skillVersionId: skillVersion.aggregateId,
				expectedRevision: skillVersion.revision,
			});

			await recordSkillVersionEvaluation(deps, {
				commandId: randomUUID(),
				skillId: skill.aggregateId,
				skillVersionId: skillVersion.aggregateId,
				expectedRevision: skillVersion.revision + 1,
				outcome: "verified",
				evaluationRef,
			});

			const agentRow = await deps.agentRepository.findById(agent.aggregateId);
			if (!agentRow) throw new Error("agent missing");

			const binding = await bindAgentSkill(deps, {
				commandId: randomUUID(),
				agentId: agent.aggregateId,
				agentVersionId: draftVersionId,
				skillVersionId: skillVersion.aggregateId,
				expectedAgentRevision: agentRow.revision,
				bindingConfig: { priority: 1 },
			});

			expect(binding.aggregateId).toMatch(/^[0-9a-f-]{36}$/i);

			const skillRows = await pool.query(
				"SELECT count(*)::int AS count FROM agents_skills WHERE id = $1",
				[skill.aggregateId],
			);
			expect(skillRows.rows[0]?.count).toBe(1);

			const versionRows = await pool.query(
				"SELECT status FROM agents_skill_versions WHERE id = $1",
				[skillVersion.aggregateId],
			);
			expect(versionRows.rows[0]?.status).toBe("verified");

			const bindingRows = await pool.query(
				"SELECT count(*)::int AS count FROM agents_agent_skill_bindings WHERE id = $1",
				[binding.aggregateId],
			);
			expect(bindingRows.rows[0]?.count).toBe(1);

			const outboxRows = await pool.query(
				"SELECT count(*)::int AS count FROM outbox WHERE owner_domain = 'agents' AND event_type = 'agents.agent_skill.bound.v1'",
			);
			expect(outboxRows.rows[0]?.count).toBeGreaterThanOrEqual(1);
		});
	});
});
