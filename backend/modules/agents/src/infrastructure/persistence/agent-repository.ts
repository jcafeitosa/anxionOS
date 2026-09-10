import { eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Agent } from "../../domain/entities/agent";
import type { AgentRepository } from "../../domain/ports/agent-repository";
import { agents, type AgentRow } from "./schema";

export function toAgent(row: AgentRow): Agent {
	return {
		id: row.id,
		organizationId: row.organizationId,
		agencyId: row.agencyId ?? undefined,
		kind: row.kind,
		displayName: row.displayName,
		status: row.status,
		activeVersionId: row.activeVersionId ?? undefined,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleAgentRepository(
	db: NodePgDatabase<{ agents: typeof agents }>,
): AgentRepository {
	return {
		async save(agent: Agent) {
			const existing = await db
				.select()
				.from(agents)
				.where(eq(agents.id, agent.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(agents)
					.set({
						agencyId: agent.agencyId ?? null,
						displayName: agent.displayName,
						status: agent.status,
						activeVersionId: agent.activeVersionId ?? null,
						revision: agent.revision,
						updatedAt: agent.updatedAt,
					})
					.where(eq(agents.id, agent.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update agent");
				return toAgent(row);
			}
			const rows = await db
				.insert(agents)
				.values({
					id: agent.id,
					tenantId: agent.organizationId,
					organizationId: agent.organizationId,
					agencyId: agent.agencyId ?? null,
					kind: agent.kind,
					displayName: agent.displayName,
					status: agent.status,
					activeVersionId: agent.activeVersionId ?? null,
					revision: agent.revision,
					createdAt: agent.createdAt,
					updatedAt: agent.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create agent");
			return toAgent(row);
		},
		async findById(agentId: string) {
			const rows = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
			return rows[0] ? toAgent(rows[0]) : null;
		},
	};
}
