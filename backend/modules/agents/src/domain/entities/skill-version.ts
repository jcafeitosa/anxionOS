import type {
	EvaluationRef,
	ObjectRef,
	SkillPermissionRequirement,
	SkillSandboxPolicy,
	SkillVersionStatus,
} from "@anxionos/contracts/agents";

export interface SkillVersion {
	id: string;
	skillId: string;
	versionNumber: number;
	status: SkillVersionStatus;
	schemaVersion: string;
	contentRef: ObjectRef;
	contentHash: string;
	permissionRequirements: SkillPermissionRequirement[];
	sandboxPolicy: SkillSandboxPolicy;
	evaluationRef?: EvaluationRef;
	promotedAt?: Date;
	createdAt: Date;
}
