import { checkCompletedPayloadSchema } from "@anxionos/contracts/risk";
import type { z } from "zod";

type CheckCompletedPayload = z.infer<typeof checkCompletedPayloadSchema>;
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import { throwDecisionsError } from "../errors";

export interface RiskCheckCompletedConsumerDeps {
	unitOfWork: DecisionsUnitOfWork;
}

export function createRiskCheckCompletedConsumer(
	deps: RiskCheckCompletedConsumerDeps,
) {
	return {
		async handle(payload: CheckCompletedPayload, eventId: string) {
			const event = checkCompletedPayloadSchema.parse(payload);
			const replayed =
				await deps.unitOfWork.runInTransaction(async (ctx) =>
					ctx.submitPreconditions.findByRiskEventId(eventId),
				);
			if (replayed) {
				if (replayed.organizationId !== event.organizationId) {
					throwDecisionsError(
						"DC_CROSS_TENANT",
						"risk event organization mismatch",
					);
				}
				return { decisionId: replayed.decisionId, idempotentReplay: true };
			}
			return deps.unitOfWork.runInTransaction(async (ctx) => {
				const preconditions =
					await ctx.submitPreconditions.findByOrganizationAndIntentHash(
						event.organizationId,
						event.intentHash,
					);
				if (!preconditions) {
					return { decisionId: null, ignored: true };
				}
				if (preconditions.organizationId !== event.organizationId) {
					throwDecisionsError(
						"DC_CROSS_TENANT",
						"risk event organization mismatch",
					);
				}
				const decision = await ctx.decisions.findById(
					preconditions.decisionId,
				);
				if (!decision || decision.organizationId !== event.organizationId) {
					throwDecisionsError("DC_DECISION_NOT_FOUND", "decision not found");
				}
				if (decision.status === "SUBMITTED") {
					return { decisionId: decision.id, ignored: true };
				}
				await ctx.submitPreconditions.updateRiskCheck(decision.id, {
					riskCheckId: event.checkId,
					riskCheckResult: event.checkResult,
					riskEventId: eventId,
				});
				const nextStatus =
					event.checkResult === "PASS" ? "CAPITAL_PENDING" : "DENIED";
				await ctx.decisions.updateStatus(
					decision.id,
					nextStatus,
					decision.revision + 1,
				);
				return { decisionId: decision.id, checkResult: event.checkResult };
			});
		},
	};
}
