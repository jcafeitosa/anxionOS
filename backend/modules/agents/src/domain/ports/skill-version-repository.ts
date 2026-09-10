import type { SkillVersion } from "../entities/skill-version";

export interface SkillVersionRepository {
	save(version: SkillVersion): Promise<SkillVersion>;
	findById(versionId: string): Promise<SkillVersion | null>;
	findBySkillAndVersionNumber(
		skillId: string,
		versionNumber: number,
	): Promise<SkillVersion | null>;
	getNextVersionNumber(skillId: string): Promise<number>;
}
