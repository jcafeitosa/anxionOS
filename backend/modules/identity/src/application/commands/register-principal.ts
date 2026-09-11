import { registerPrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal, PrincipalKind } from "../../domain/entities/principal";
import { createPrincipalRegisteredEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface RegisterPrincipalInput {
	authUserId: string;
	email: string;
	kind?: PrincipalKind;
	commandId?: string;
}

export interface RegisterPrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

/**
 * D-IDN-006: idempotent by `authUserId` — a repeated registration returns the
 * existing principal and emits no second event. R04 additionally materializes
 * an `Idempotency-Key` as `commandId` in the journal when the caller provides one.
 */
export async function registerPrincipal(
	deps: RegisterPrincipalDeps,
	input: RegisterPrincipalInput,
): Promise<Principal> {
	const command = registerPrincipalCommandSchema.parse(input);
	const existing = await deps.repository.findByAuthUserId(command.authUserId);
	if (existing) {
		return existing;
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		if (command.commandId) {
			const journaled = await context.commandJournal.findByCommandId(
				command.commandId,
			);
			if (journaled) {
				const replayed = await context.principalRepository.findByAuthUserId(
					command.authUserId,
				);
				if (replayed) {
					return replayed;
				}
			}
		}
		const raced = await context.principalRepository.findByAuthUserId(
			command.authUserId,
		);
		if (raced) {
			return raced;
		}
		const emailTaken = await context.principalRepository.findByEmail(
			command.email,
		);
		if (emailTaken) {
			throwIdentityError(
				"IDN_PRINCIPAL_EMAIL_TAKEN",
				"Email already registered",
			);
		}
		const principal = await context.principalRepository.create({
			authUserId: command.authUserId,
			email: command.email,
			kind: command.kind ?? "human",
		});
		await context.publishEvents([
			createPrincipalRegisteredEvent({
				principalId: principal.id,
				email: principal.email,
				kind: principal.kind,
				revision: principal.revision,
			}),
		]);
		if (command.commandId) {
			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "RegisterPrincipal",
				aggregateId: principal.id,
				aggregateType: "Principal",
				revision: principal.revision,
				responseSnapshot: {
					aggregateId: principal.id,
					revision: principal.revision,
					status: principal.status,
				},
			});
		}
		return principal;
	});
}
