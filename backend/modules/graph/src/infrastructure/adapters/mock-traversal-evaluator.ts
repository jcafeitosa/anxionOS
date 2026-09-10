import type {
	TraversalEvaluationInput,
	TraversalEvaluator,
	TraversalEvaluatorOutput,
} from "../../domain/ports/traversal-evaluator";
import { evaluateT02Temporal } from "../../application/traversal/t02-temporal-evaluation";

export interface GraphF0Fixture {
	grant: {
		grantIds: string[];
	};
	principalAgency: {
		principalId: string;
	};
	authorityEpoch: number;
	riskEpoch: number;
	projectionGeneration: number;
	checkpoint: string;
}

function authorizationOutput(
	fixture: GraphF0Fixture,
	input: TraversalEvaluationInput,
): Extract<TraversalEvaluatorOutput, { decision: string }> {
	const allowed =
		"actorId" in input.input &&
		input.input.actorId === fixture.principalAgency.principalId &&
		"action" in input.input &&
		input.input.action === "graph.node.read";
	return allowed
		? {
				decision: "ALLOW",
				authorityEpoch: fixture.authorityEpoch,
				riskEpoch: fixture.riskEpoch,
				proof: { grantIds: fixture.grant.grantIds },
			}
		: {
				decision: "DENY",
				authorityEpoch: fixture.authorityEpoch,
				riskEpoch: fixture.riskEpoch,
				denyReasons: ["MOCK_EVALUATOR_DENY"],
			};
}
export function createMockTraversalEvaluator(
	fixture: GraphF0Fixture,
): TraversalEvaluator {
	return {
		async evaluate(input) {
			let data: TraversalEvaluatorOutput;
			switch (input.traversalId) {
				case "T02": {
					const t02Input = input.input;
					if (!("validAt" in t02Input)) {
						throw new Error("T02 requires temporal params");
					}
					const t02Result = evaluateT02Temporal({
						params: t02Input,
						knownAt: input.temporal.knownAt,
					});
					data = { complete: t02Result.complete };
					break;
				}
				case "T04":
					data = { complete: true };
					break;
				case "T05":
					data = { complete: true };
					break;
				case "T03": {
					const base = authorizationOutput(fixture, input);
					data = {
						...base,
						reasonTree: [
							{
								stage:
									base.decision === "ALLOW" ? "grant_match" : "deny_default",
								decision: base.decision,
								message:
									base.decision === "ALLOW"
										? "Mock F0 grant matched"
										: "Mock F0 default deny",
							},
						],
					};
					break;
				}
				default: {
					data = authorizationOutput(fixture, input);
				}
			}
			return {
				data,
				authorityEpoch: fixture.authorityEpoch,
				riskEpoch: fixture.riskEpoch,
				projectionGeneration: fixture.projectionGeneration,
				checkpoint: fixture.checkpoint,
			};
		},
	};
}
