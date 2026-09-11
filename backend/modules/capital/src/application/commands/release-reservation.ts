import {
	type CapitalCommandResult,
	capitalCommandResultSchema,
	type ReleaseReservationCommand,
	releaseReservationCommandSchema,
} from "@anxionos/contracts/capital";
import {
	compareDecimalAmounts,
	subtractDecimalAmounts,
} from "../../domain/decimal-amount";
import { createReservationReleasedEvent } from "../../domain/events/capital-events";
import type {
	CapitalTransactionContext,
	CapitalUnitOfWork,
} from "../../domain/ports/capital-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	assertCommandJournalReplay,
	CommandJournalHashMismatchError,
	hashCommandPayload,
	loadIdempotentCommandResultWithGuard,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwCapitalError } from "../errors";

export interface ReleaseReservationDeps {
	unitOfWork: CapitalUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function releaseReservation(
	deps: ReleaseReservationDeps,
	input: ReleaseReservationCommand,
): Promise<CapitalCommandResult> {
	const command = releaseReservationCommandSchema.parse(input);
	const requestHash = hashCommandPayload(command);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwCapitalError(
			"CAP_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	let replay: CapitalCommandResult | null = null;
	try {
		replay = await loadIdempotentCommandResultWithGuard(
			deps.commandJournal,
			command.commandId,
			command.organizationId,
			requestHash,
		);
	} catch (error) {
		if (error instanceof CommandJournalHashMismatchError) {
			throwCapitalError(
				"CAP_REVISION_CONFLICT",
				"command journal request hash mismatch",
			);
		}
		throw error;
	}
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(
		async (ctx: CapitalTransactionContext) => {
			const raced = await ctx.commandJournal.findByCommandId(command.commandId);
			if (raced) {
				if (raced.organizationId !== command.organizationId) {
					throwCapitalError(
						"CAP_CROSS_TENANT",
						"command journal organization mismatch",
					);
				}
				try {
					assertCommandJournalReplay(raced.responseSnapshot, requestHash);
				} catch (error) {
					if (error instanceof CommandJournalHashMismatchError) {
						throwCapitalError(
							"CAP_REVISION_CONFLICT",
							"command journal request hash mismatch",
						);
					}
					throw error;
				}
				const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
				return capitalCommandResultSchema.parse({
					...parsed,
					idempotentReplay: true,
				});
			}
			const reservation = await ctx.reservations.findByIdForUpdate(
				command.reservationId,
				command.organizationId,
			);
			if (!reservation) {
				throwCapitalError(
					"CAP_RESERVATION_NOT_FOUND",
					`Reservation ${command.reservationId} not found`,
				);
			}
			if (reservation.status !== "HELD") {
				throwCapitalError(
					"CAP_INVALID_RESERVATION_STATE",
					`Reservation ${command.reservationId} is ${reservation.status}`,
				);
			}
			if (command.reason === "expired") {
				if (
					compareDecimalAmounts(command.releaseAmount, reservation.amount) !== 0
				) {
					throwCapitalError(
						"CAP_INVALID_RESERVATION_STATE",
						"Expired release must match full held amount",
					);
				}
			}
			if (
				compareDecimalAmounts(command.releaseAmount, reservation.amount) > 0
			) {
				throwCapitalError(
					"CAP_RELEASE_EXCEEDS_RESERVED",
					`Cannot release ${command.releaseAmount} from held ${reservation.amount}`,
				);
			}
			const remainingAmount = subtractDecimalAmounts(
				reservation.amount,
				command.releaseAmount,
			);
			const nextStatus =
				command.reason === "expired"
					? "EXPIRED"
					: remainingAmount === "0"
						? "RELEASED"
						: "HELD";
			const terminal = nextStatus === "RELEASED" || nextStatus === "EXPIRED";
			const updated = await ctx.reservations.update({
				...reservation,
				amount: terminal ? "0" : remainingAmount,
				status: nextStatus,
			});
			await ctx.publishEvents([
				createReservationReleasedEvent({
					reservationId: updated.id,
					accountId: updated.accountId,
					organizationId: command.organizationId,
					releasedAmount: command.releaseAmount,
					remainingAmount: terminal ? "0" : remainingAmount,
					asset: updated.asset,
					reason: command.reason,
					status: nextStatus,
				}),
			]);
			const result = capitalCommandResultSchema.parse({
				aggregateId: updated.id,
				revision: 1,
				accountId: updated.accountId,
				reservationId: updated.id,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "releaseReservation",
				responseSnapshot: toCommandResultSnapshot(result, requestHash),
			});
			return result;
		},
	);
}
