import type { EvaluationRef } from "@anxionos/contracts/agents";

export interface SkillEvaluationGuardPort {
	assertEvaluationAllowed(input: {
		organizationId: string;
		agencyId: string;
		skillId: string;
		skillVersionId: string;
		outcome: "verified" | "rejected";
		evaluationRef: EvaluationRef;
		actorPrincipalId: string;
	}): Promise<void>;
}
