import { riskEpochBumpedPayloadSchema } from "@anxionos/contracts/risk";
import type { z } from "zod";
import { createPermitRevokedEvent } from "../../domain/events/risk-events";
import type { RiskUnitOfWork } from "../../domain/ports/risk-unit-of-work";
import { throwRiskError } from "../errors";

type RiskEpochBumpedPayload = z.infer<typeof riskEpochBumpedPayloadSchema>;

export const RISK_EPOCH_BUMPED_CONSUMER_NAME =
	"risk.epoch.bumped.revoke-stale-permits";

export interface RiskEpochBumpedConsumerDeps {
	unitOfWork: RiskUnitOfWork;
}

export interface RiskEpochBumpedConsumerResult {
	organizationId: string;
	revokedPermitIds: string[];
	idempotentReplay?: boolean;
}

export function createRiskEpochBumpedConsumer(
	deps: RiskEpochBumpedConsumerDeps,
) {
	return {
		async handle(
			payload: RiskEpochBumpedPayload,
			eventId: string,
		): Promise<RiskEpochBumpedConsumerResult> {
			const event = riskEpochBumpedPayloadSchema.parse(payload);
			const replayed = await deps.unitOfWork.runInTransaction(async (ctx) =>
				ctx.consumerDedup.findByEventId(eventId),
			);
			if (replayed) {
				if (replayed.organizationId !== event.organizationId) {
					throwRiskError(
						"RK_CROSS_TENANT",
						"epoch consumer dedup organization mismatch",
					);
				}
				return {
					organizationId: event.organizationId,
					revokedPermitIds: [],
					idempotentReplay: true,
				};
			}
			return deps.unitOfWork.runInTransaction(async (ctx) => {
				const raced = await ctx.consumerDedup.findByEventId(eventId);
				if (raced) {
					if (raced.organizationId !== event.organizationId) {
						throwRiskError(
							"RK_CROSS_TENANT",
							"epoch consumer dedup organization mismatch",
						);
					}
					return {
						organizationId: event.organizationId,
						revokedPermitIds: [],
						idempotentReplay: true,
					};
				}
				const epoch = await ctx.epochRegistry.findByOrganization(
					event.organizationId,
				);
				if (!epoch || epoch.currentRiskEpoch !== event.currentRiskEpoch) {
					throwRiskError(
						"RK_PERMIT_STALE",
						"epoch registry does not match bumped event",
					);
				}
				const stalePermits = await ctx.permits.findIssuedBelowEpoch(
					event.organizationId,
					event.currentRiskEpoch,
				);
				const revokedPermitIds: string[] = [];
				const events = [];
				for (const permit of stalePermits) {
					if (permit.organizationId !== event.organizationId) {
						throwRiskError(
							"RK_CROSS_TENANT",
							"stale permit organization mismatch",
						);
					}
					const revoked = await ctx.permits.revokeIssued({
						organizationId: event.organizationId,
						permitId: permit.id,
					});
					if (!revoked) continue;
					revokedPermitIds.push(revoked.id);
					events.push(
						createPermitRevokedEvent({
							permitId: revoked.id,
							checkId: revoked.checkId,
							organizationId: revoked.organizationId,
							intentHash: revoked.intentHash,
							authorityEpoch: revoked.authorityEpoch,
							riskEpoch: revoked.riskEpoch,
							currentRiskEpoch: event.currentRiskEpoch,
							revokedReason: "RiskEpochBumped",
						}),
					);
				}
				if (events.length > 0) {
					await ctx.publishEvents(events);
				}
				await ctx.consumerDedup.save({
					eventId,
					consumerName: RISK_EPOCH_BUMPED_CONSUMER_NAME,
					organizationId: event.organizationId,
				});
				return {
					organizationId: event.organizationId,
					revokedPermitIds,
				};
			});
		},
	};
}
