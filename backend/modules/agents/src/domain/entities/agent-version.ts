import type {
	AgentVersionStatus,
	AutonomyLevel,
	ModelSlotBinding,
	ObjectRef,
	SkillRef,
} from "@anxionos/contracts/agents";

export interface AgentVersion {
	id: string;
	agentId: string;
	versionNumber: number;
	status: AgentVersionStatus;
	instructionRef: ObjectRef;
	skillRefs: SkillRef[];
	capabilityManifestHash: string;
	modelSlots: ModelSlotBinding[];
	autonomyLevel: AutonomyLevel;
	publishedAt?: Date;
	createdAt: Date;
}
