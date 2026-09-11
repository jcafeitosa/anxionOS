import type {
	EvaluationRef,
	ObjectRef,
	SkillPermissionRequirement,
	SkillSandboxPolicy,
} from "@anxionos/contracts/agents";
import { and, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { SkillVersion } from "../../domain/entities/skill-version";
import type { SkillVersionRepository } from "../../domain/ports/skill-version-repository";
import { type SkillVersionRow, skills, skillVersions } from "./schema";

function readObjectRef(value: unknown): ObjectRef {
	if (typeof value !== "object" || value === null) {
		throw new Error("Invalid contentRef in skill version row");
	}
	return value as ObjectRef;
}

function readPermissionRequirements(
	value: unknown,
): SkillPermissionRequirement[] {
	return Array.isArray(value) ? (value as SkillPermissionRequirement[]) : [];
}

function readSandboxPolicy(value: unknown): SkillSandboxPolicy {
	if (typeof value !== "object" || value === null) {
		return { allowedSideEffects: [], requiresApproval: false };
	}
	return value as SkillSandboxPolicy;
}

function readEvaluationRef(value: unknown): EvaluationRef | undefined {
	if (typeof value !== "object" || value === null) {
		return undefined;
	}
	return value as EvaluationRef;
}

export function toSkillVersion(row: SkillVersionRow): SkillVersion {
	return {
		id: row.id,
		skillId: row.skillId,
		versionNumber: row.versionNumber,
		status: row.status,
		schemaVersion: row.schemaVersion,
		contentRef: readObjectRef(row.contentRef),
		contentHash: row.contentHash,
		permissionRequirements: readPermissionRequirements(
			row.permissionRequirements,
		),
		sandboxPolicy: readSandboxPolicy(row.sandboxPolicy),
		evaluationRef: readEvaluationRef(row.evaluationRef),
		promotedAt: row.promotedAt ?? undefined,
		createdAt: row.createdAt,
	};
}

export function createDrizzleSkillVersionRepository(
	db: NodePgDatabase<{
		skillVersions: typeof skillVersions;
		skills: typeof skills;
	}>,
): SkillVersionRepository {
	return {
		async save(version: SkillVersion) {
			const existing = await db
				.select()
				.from(skillVersions)
				.where(eq(skillVersions.id, version.id))
				.limit(1);
			if (existing[0]) {
				if (
					existing[0].status === "verified" ||
					existing[0].status === "revoked"
				) {
					throw new Error("Verified or revoked skill version is immutable");
				}
				const rows = await db
					.update(skillVersions)
					.set({
						status: version.status,
						schemaVersion: version.schemaVersion,
						contentRef: version.contentRef,
						contentHash: version.contentHash,
						permissionRequirements: version.permissionRequirements,
						sandboxPolicy: version.sandboxPolicy,
						evaluationRef: version.evaluationRef ?? null,
						promotedAt: version.promotedAt ?? null,
					})
					.where(eq(skillVersions.id, version.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update skill version");
				return toSkillVersion(row);
			}

			const skillRows = await db
				.select({ organizationId: skills.organizationId })
				.from(skills)
				.where(eq(skills.id, version.skillId))
				.limit(1);
			const organizationId = skillRows[0]?.organizationId;
			if (!organizationId) {
				throw new Error(
					`Skill not found for version insert: ${version.skillId}`,
				);
			}

			const rows = await db
				.insert(skillVersions)
				.values({
					id: version.id,
					tenantId: organizationId,
					skillId: version.skillId,
					versionNumber: version.versionNumber,
					status: version.status,
					schemaVersion: version.schemaVersion,
					contentRef: version.contentRef,
					contentHash: version.contentHash,
					permissionRequirements: version.permissionRequirements,
					sandboxPolicy: version.sandboxPolicy,
					evaluationRef: version.evaluationRef ?? null,
					promotedAt: version.promotedAt ?? null,
					createdAt: version.createdAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create skill version");
			return toSkillVersion(row);
		},
		async findById(versionId: string) {
			const rows = await db
				.select()
				.from(skillVersions)
				.where(eq(skillVersions.id, versionId))
				.limit(1);
			return rows[0] ? toSkillVersion(rows[0]) : null;
		},
		async findBySkillAndVersionNumber(skillId: string, versionNumber: number) {
			const rows = await db
				.select()
				.from(skillVersions)
				.where(
					and(
						eq(skillVersions.skillId, skillId),
						eq(skillVersions.versionNumber, versionNumber),
					),
				)
				.limit(1);
			return rows[0] ? toSkillVersion(rows[0]) : null;
		},
		async getNextVersionNumber(skillId: string) {
			const rows = await db
				.select({ versionNumber: skillVersions.versionNumber })
				.from(skillVersions)
				.where(eq(skillVersions.skillId, skillId))
				.orderBy(desc(skillVersions.versionNumber))
				.limit(1);
			return (rows[0]?.versionNumber ?? 0) + 1;
		},
	};
}
