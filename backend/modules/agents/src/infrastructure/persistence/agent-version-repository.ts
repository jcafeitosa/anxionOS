import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type {
	AutonomyLevel,
	ModelSlotBinding,
	ObjectRef,
	SkillRef,
} from "@anxionos/contracts/agents";
import type { AgentVersion } from "../../domain/entities/agent-version";
import type { AgentVersionRepository } from "../../domain/ports/agent-version-repository";
import { agentVersions, agents, type AgentVersionRow } from "./schema";

function readObjectRef(value: unknown): ObjectRef {
	if (typeof value !== "object" || value === null) {
		throw new Error("Invalid instructionRef in agent version row");
	}
	return value as ObjectRef;
}

function readSkillRefs(value: unknown): SkillRef[] {
	return Array.isArray(value) ? (value as SkillRef[]) : [];
}

function readModelSlots(value: unknown): ModelSlotBinding[] {
	return Array.isArray(value) ? (value as ModelSlotBinding[]) : [];
}

export function toAgentVersion(row: AgentVersionRow): AgentVersion {
	return {
		id: row.id,
		agentId: row.agentId,
		versionNumber: row.versionNumber,
		status: row.status,
		instructionRef: readObjectRef(row.instructionRef),
		skillRefs: readSkillRefs(row.skillRefs),
		capabilityManifestHash: row.capabilityManifestHash,
		modelSlots: readModelSlots(row.modelSlots),
		autonomyLevel: row.autonomyLevel as AutonomyLevel,
		publishedAt: row.publishedAt ?? undefined,
		createdAt: row.createdAt,
	};
}

export function createDrizzleAgentVersionRepository(
	db: NodePgDatabase<{ agentVersions: typeof agentVersions; agents: typeof agents }>,
): AgentVersionRepository {
	return {
		async save(version: AgentVersion) {
			const existing = await db
				.select()
				.from(agentVersions)
				.where(eq(agentVersions.id, version.id))
				.limit(1);
			if (existing[0]) {
				if (existing[0].status === "published") {
					throw new Error("Published agent version is immutable");
				}
				const rows = await db
					.update(agentVersions)
					.set({
						status: version.status,
						instructionRef: version.instructionRef,
						skillRefs: version.skillRefs,
						capabilityManifestHash: version.capabilityManifestHash,
						modelSlots: version.modelSlots,
						autonomyLevel: version.autonomyLevel,
						publishedAt: version.publishedAt ?? null,
					})
					.where(eq(agentVersions.id, version.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update agent version");
				return toAgentVersion(row);
			}

			const agentRows = await db
				.select({ organizationId: agents.organizationId })
				.from(agents)
				.where(eq(agents.id, version.agentId))
				.limit(1);
			const organizationId = agentRows[0]?.organizationId;
			if (!organizationId) {
				throw new Error(`Agent not found for version insert: ${version.agentId}`);
			}

			const rows = await db
				.insert(agentVersions)
				.values({
					id: version.id,
					tenantId: organizationId,
					agentId: version.agentId,
					versionNumber: version.versionNumber,
					status: version.status,
					instructionRef: version.instructionRef,
					skillRefs: version.skillRefs,
					capabilityManifestHash: version.capabilityManifestHash,
					modelSlots: version.modelSlots,
					autonomyLevel: version.autonomyLevel,
					publishedAt: version.publishedAt ?? null,
					createdAt: version.createdAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create agent version");
			return toAgentVersion(row);
		},
		async findById(versionId: string) {
			const rows = await db
				.select()
				.from(agentVersions)
				.where(eq(agentVersions.id, versionId))
				.limit(1);
			return rows[0] ? toAgentVersion(rows[0]) : null;
		},
		async findByAgentAndVersionNumber(agentId: string, versionNumber: number) {
			const rows = await db
				.select()
				.from(agentVersions)
				.where(
					and(
						eq(agentVersions.agentId, agentId),
						eq(agentVersions.versionNumber, versionNumber),
					),
				)
				.limit(1);
			return rows[0] ? toAgentVersion(rows[0]) : null;
		},
		async listByAgentId(agentId: string) {
			const rows = await db
				.select()
				.from(agentVersions)
				.where(eq(agentVersions.agentId, agentId));
			return rows.map(toAgentVersion);
		},
	};
}
