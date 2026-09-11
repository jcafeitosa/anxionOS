import { and, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Skill } from "../../domain/entities/skill";
import type { SkillRepository } from "../../domain/ports/skill-repository";
import { type SkillRow, skills } from "./schema";

export function toSkill(row: SkillRow): Skill {
	return {
		id: row.id,
		organizationId: row.organizationId,
		agencyId: row.agencyId ?? undefined,
		slug: row.slug,
		displayName: row.displayName,
		description: row.description ?? undefined,
		revision: row.revision,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

export function createDrizzleSkillRepository(
	db: NodePgDatabase<{ skills: typeof skills }>,
): SkillRepository {
	return {
		async save(skill: Skill) {
			const existing = await db
				.select()
				.from(skills)
				.where(eq(skills.id, skill.id))
				.limit(1);
			if (existing[0]) {
				const rows = await db
					.update(skills)
					.set({
						displayName: skill.displayName,
						description: skill.description ?? null,
						revision: skill.revision,
						updatedAt: skill.updatedAt,
					})
					.where(eq(skills.id, skill.id))
					.returning();
				const row = rows[0];
				if (!row) throw new Error("Failed to update skill");
				return toSkill(row);
			}
			const rows = await db
				.insert(skills)
				.values({
					id: skill.id,
					tenantId: skill.organizationId,
					organizationId: skill.organizationId,
					agencyId: skill.agencyId ?? null,
					slug: skill.slug,
					displayName: skill.displayName,
					description: skill.description ?? null,
					revision: skill.revision,
					createdAt: skill.createdAt,
					updatedAt: skill.updatedAt,
				})
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create skill");
			return toSkill(row);
		},
		async findById(skillId: string) {
			const rows = await db
				.select()
				.from(skills)
				.where(eq(skills.id, skillId))
				.limit(1);
			return rows[0] ? toSkill(rows[0]) : null;
		},
		async findByOrganizationAndSlug(organizationId: string, slug: string) {
			const rows = await db
				.select()
				.from(skills)
				.where(
					and(eq(skills.organizationId, organizationId), eq(skills.slug, slug)),
				)
				.limit(1);
			return rows[0] ? toSkill(rows[0]) : null;
		},
	};
}
