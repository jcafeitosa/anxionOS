import { randomUUID } from "node:crypto";
import type { CapitalUnitOfWork } from "../../domain/ports/capital-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import { releaseReservation } from "./release-reservation";

export interface SweepExpiredReservationsDeps {
	unitOfWork: CapitalUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export interface SweepExpiredReservationsInput {
	organizationId: string;
	asOf: string;
	limit?: number;
}

export interface SweepExpiredReservationsResult {
	expiredCount: number;
	reservationIds: string[];
}

export async function sweepExpiredReservations(
	deps: SweepExpiredReservationsDeps,
	input: SweepExpiredReservationsInput,
): Promise<SweepExpiredReservationsResult> {
	const limit = input.limit ?? 100;
	const expired = await deps.unitOfWork.runInTransaction(async (ctx) =>
		ctx.reservations.findExpiredHeld(input.organizationId, input.asOf, limit),
	);
	const reservationIds: string[] = [];
	for (const reservation of expired) {
		await releaseReservation(deps, {
			commandId: randomUUID(),
			organizationId: reservation.organizationId,
			reservationId: reservation.id,
			releaseAmount: reservation.amount,
			reason: "expired",
		});
		reservationIds.push(reservation.id);
	}
	return { expiredCount: reservationIds.length, reservationIds };
}
