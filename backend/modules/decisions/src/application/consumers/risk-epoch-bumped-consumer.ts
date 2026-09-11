import { riskEpochBumpedPayloadSchema } from "@anxionos/contracts/risk";
import type { z } from "zod";
import type { DecisionsConsumerDedupRepository } from "../../domain/ports/consumer-dedup";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import { throwDecisionsError } from "../errors";

type RiskEpochBumpedPayload = z.infer<typeof riskEpochBumpedPayloadSchema>;

export const DECISIONS_RISK_EPOCH_BUMPED_CONSUMER_NAME =
	"decisions.risk.epoch.bumped.invalidate-preconditions";

export interface RiskEpochBumpedConsumerDeps {
	unitOfWork: DecisionsUnitOfWork;
	consumerDedup: DecisionsConsumerDedupRepository;
}

export function createRiskEpochBumpedConsumer(deps: RiskEpochBumpedConsumerDeps) {
	return {
		async handle(payload: RiskEpochBumpedPayload, eventId: string) {
			const event = riskEpochBumpedPayloadSchema.parse(payload);
			const replayed = await deps.consumerDedup.findByEventId(eventId);
			if (replayed) {
				if (replayed.organizationId !== event.organizationId) {
					throwDecisionsError(
						"DC_CROSS_TENANT",
						"epoch consumer dedup organization mismatch",
					);
				}
				return {
					organizationId: event.organizationId,
					invalidatedDecisionIds: [],
					idempotentReplay: true,
				};
			}
			return deps.unitOfWork.runInTransaction(async (ctx) => {
				const invalidatedDecisionIds =
					await ctx.submitPreconditions.invalidateRiskPassForOrganization(
						event.organizationId,
					);
				for (const decisionId of invalidatedDecisionIds) {
					const decision = await ctx.decisions.findById(decisionId);
					if (!decision || decision.organizationId !== event.organizationId) {
						throwDecisionsError(
							"DC_CROSS_TENANT",
							"decision organization mismatch during epoch invalidation",
						);
					}
					if (
						decision.status === "CAPITAL_PENDING" ||
						decision.status === "RISK_CHECKED"
					) {
						await ctx.decisions.updateStatus(
							decision.id,
							"RISK_PENDING",
							decision.revision + 1,
						);
					}
				}
				await deps.consumerDedup.save({
					eventId,
					consumerName: DECISIONS_RISK_EPOCH_BUMPED_CONSUMER_NAME,
					organizationId: event.organizationId,
				});
				return {
					organizationId: event.organizationId,
					invalidatedDecisionIds,
				};
			});
		},
	};
}
