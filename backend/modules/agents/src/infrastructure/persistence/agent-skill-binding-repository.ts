import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SkillBindingConfig } from "@anxionos/contracts/agents";
import type { AgentSkillBinding } from "../../domain/entities/agent-skill-binding";
import type { AgentSkillBindingRepository } from "../../domain/ports/agent-skill-binding-repository";
import {
	agentSkillBindings,
	agentVersions,
	agents,
	type AgentSkillBindingRow,
} from "./schema";

function readBindingConfig(value: unknown): SkillBindingConfig {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return {};
	}
	return value as SkillBindingConfig;
}

export function toAgentSkillBinding(row: AgentSkillBindingRow): AgentSkillBinding {
	return {
		id: row.id,
		agentVersionId: row.agentVersionId,
		skillVersionId: row.skillVersionId,
		bindingConfig: readBindingConfig(row.bindingConfig),
		createdAt: row.createdAt,
	};
}

export function createDrizzleAgentSkillBindingRepository(
	db: NodePgDatabase<{
		agentSkillBindings: typeof agentSkillBindings;
		agentVersions: typeof agentVersions;
		agents: typeof agents;
	}>,
): AgentSkillBindingRepository {
	return {
		async save(binding: AgentSkillBinding) {
			const existing = await db
				.select()
				.from(agentSkillBindings)
				.where(eq(agentSkillBindings.id, binding.id))
				.limit(1);
			if (existing[0]) {
				return toAgentSkillBinding(existing[0]);
			}

			const versionRows = await db
				.select({ organizationId: agents.organizationId })
				.from(agentVersions)
				.innerJoin(agents, eq(agentVersions.agentId, agents.id))
				.where(eq(agentVersions.id, binding.agentVersionId))
				.limit(1);
			const organizationId = versionRows[0]?.organizationId;
			if (!organizationId) {
				throw new Error(
					`Agent version not found for binding insert: ${binding.agentVersionId}`,
				);
			}

			const rows = await db
				.insert(agentSkillBindings)
				.values({
					id: binding.id,
					tenantId: organizationId,
					agentVersionId: binding.agentVersionId,
					skillVersionId: binding.skillVersionId,
					bindingConfig: binding.bindingConfig,
					createdAt: binding.createdAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create agent skill binding");
			return toAgentSkillBinding(row);
		},
		async findByAgentVersionAndSkillVersion(
			agentVersionId: string,
			skillVersionId: string,
		) {
			const rows = await db
				.select()
				.from(agentSkillBindings)
				.where(
					and(
						eq(agentSkillBindings.agentVersionId, agentVersionId),
						eq(agentSkillBindings.skillVersionId, skillVersionId),
					),
				)
				.limit(1);
			return rows[0] ? toAgentSkillBinding(rows[0]) : null;
		},
	};
}
