import type { DecisionRecord } from "../domain/ports/decisions-unit-of-work";
import type { SubmitPreconditionsRepository } from "../domain/ports/submit-preconditions";
import type { CapitalReservationQueryPort } from "../domain/ports/capital-reservation-query-port";
import { throwDecisionsError } from "./errors";

export async function armSubmitPreconditions(
	submitPreconditions: SubmitPreconditionsRepository,
	decision: DecisionRecord,
	intentHash: string,
): Promise<void> {
	const existing = await submitPreconditions.findByDecisionId(decision.id);
	if (existing) {
		if (existing.organizationId !== decision.organizationId) {
			throwDecisionsError(
				"DC_CROSS_TENANT",
				"submit preconditions organization mismatch",
			);
		}
		if (existing.intentHash !== intentHash) {
			throwDecisionsError(
				"DC_SUBMIT_PRECONDITION",
				"intent hash already bound to decision",
			);
		}
		return;
	}
	const boundElsewhere =
		await submitPreconditions.findByOrganizationAndIntentHash(
			decision.organizationId,
			intentHash,
		);
	if (boundElsewhere && boundElsewhere.decisionId !== decision.id) {
		throwDecisionsError(
			"DC_SUBMIT_PRECONDITION",
			"intent hash already bound to another decision",
		);
	}
	await submitPreconditions.save({
		decisionId: decision.id,
		organizationId: decision.organizationId,
		intentHash,
	});
}

export async function assertSubmitPreconditionsMet(
	submitPreconditions: SubmitPreconditionsRepository,
	decisionId: string,
	organizationId: string,
	intentHash: string,
	capitalReservationQuery?: CapitalReservationQueryPort,
): Promise<void> {
	const preconditions =
		await submitPreconditions.findByDecisionId(decisionId);
	if (!preconditions || preconditions.organizationId !== organizationId) {
		throwDecisionsError(
			"DC_SUBMIT_PRECONDITION",
			"submit preconditions not armed",
		);
	}
	if (preconditions.intentHash !== intentHash) {
		throwDecisionsError(
			"DC_SUBMIT_PRECONDITION",
			"intent hash does not match armed preconditions",
		);
	}
	if (preconditions.riskCheckResult === "DENY") {
		throwDecisionsError("DC_RISK_DENIED", "risk check denied");
	}
	if (preconditions.riskCheckResult !== "PASS" || !preconditions.riskCheckId) {
		throwDecisionsError(
			"DC_SUBMIT_PRECONDITION",
			"risk check pass required before submit",
		);
	}
	if (!preconditions.capitalReservationId) {
		throwDecisionsError(
			"DC_SUBMIT_PRECONDITION",
			"capital reservation required before submit",
		);
	}
	if (capitalReservationQuery) {
		const held = await capitalReservationQuery.findHeldByIntentHash(
			organizationId,
			intentHash,
		);
		if (
			!held ||
			held.reservationId !== preconditions.capitalReservationId
		) {
			throwDecisionsError(
				"DC_SUBMIT_PRECONDITION",
				"capital reservation is not HELD",
			);
		}
	}
}
