import { reservationCreatedPayloadSchema } from "@anxionos/contracts/capital";
import type { z } from "zod";

type ReservationCreatedPayload = z.infer<typeof reservationCreatedPayloadSchema>;
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import { throwDecisionsError } from "../errors";

export interface CapitalReservationCreatedConsumerDeps {
	unitOfWork: DecisionsUnitOfWork;
}

export function createCapitalReservationCreatedConsumer(
	deps: CapitalReservationCreatedConsumerDeps,
) {
	return {
		async handle(payload: ReservationCreatedPayload, eventId: string) {
			const event = reservationCreatedPayloadSchema.parse(payload);
			const replayed =
				await deps.unitOfWork.runInTransaction(async (ctx) =>
					ctx.submitPreconditions.findByCapitalEventId(eventId),
				);
			if (replayed) {
				return {
					decisionId: replayed.decisionId,
					idempotentReplay: true,
				};
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
						"capital event organization mismatch",
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
				if (preconditions.riskCheckResult !== "PASS") {
					throwDecisionsError(
						"DC_SUBMIT_PRECONDITION",
						"risk pass required before capital reservation",
					);
				}
				await ctx.submitPreconditions.updateCapitalReservation(decision.id, {
					capitalReservationId: event.reservationId,
					capitalEventId: eventId,
				});
				if (decision.status !== "CAPITAL_PENDING") {
					await ctx.decisions.updateStatus(
						decision.id,
						"CAPITAL_PENDING",
						decision.revision + 1,
					);
				}
				return { decisionId: decision.id };
			});
		},
	};
}
