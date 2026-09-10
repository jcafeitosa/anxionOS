import type { Skill } from "../entities/skill";

export interface SkillRepository {
	save(skill: Skill): Promise<Skill>;
	findById(skillId: string): Promise<Skill | null>;
	findByOrganizationAndSlug(
		organizationId: string,
		slug: string,
	): Promise<Skill | null>;
}
