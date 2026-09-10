import type { SkillBindingConfig } from "@anxionos/contracts/agents";

export interface AgentSkillBinding {
	id: string;
	agentVersionId: string;
	skillVersionId: string;
	bindingConfig: SkillBindingConfig;
	createdAt: Date;
}
