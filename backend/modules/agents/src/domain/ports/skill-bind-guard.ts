export interface SkillBindGuardPort {
	assertBindAllowed(input: {
		agencyId: string;
		agentId: string;
	}): Promise<void>;
}
