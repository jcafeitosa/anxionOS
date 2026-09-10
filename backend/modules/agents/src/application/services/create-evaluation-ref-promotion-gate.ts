import type { SkillEvaluationGuardPort } from "../../domain/ports/skill-evaluation-guard";
import { assertEvaluationRefMatchesOutcome } from "./evaluation-ref-gate";

export function createEvaluationRefPromotionGate(): SkillEvaluationGuardPort {
	return {
		async assertEvaluationAllowed(input) {
			assertEvaluationRefMatchesOutcome(input);
		},
	};
}
