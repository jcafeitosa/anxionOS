import type { EvaluationRef } from "@anxionos/contracts/agents";
import { throwAgentsError } from "../errors";

export function assertEvaluationRefMatchesOutcome(input: {
	outcome: "verified" | "rejected";
	evaluationRef: EvaluationRef;
}): void {
	const expectedRefOutcome = input.outcome === "verified" ? "pass" : "fail";
	if (input.evaluationRef.outcome !== expectedRefOutcome) {
		throwAgentsError(
			"AGT_SKILL_EVALUATION_GATE_DENIED",
			`Evaluation ref outcome ${input.evaluationRef.outcome} does not match promotion outcome ${input.outcome}`,
		);
	}
}
