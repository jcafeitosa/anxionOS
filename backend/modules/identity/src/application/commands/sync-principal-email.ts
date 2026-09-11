import { syncPrincipalEmailCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import { createPrincipalEmailUpdatedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface SyncPrincipalEmailInput {
	principalId: string;
	email: string;
}

export interface SyncPrincipalEmailDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

export async function syncPrincipalEmail(
	deps: SyncPrincipalEmailDeps,
	input: SyncPrincipalEmailInput,
): Promise<Principal> {
	const command = syncPrincipalEmailCommandSchema.parse(input);
	const existing = await deps.repository.findById(command.principalId);
	if (!existing) {
		throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
	}
	if (existing.email === command.email) {
		return existing;
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const emailTaken = await context.principalRepository.findByEmail(
			command.email,
		);
		if (emailTaken && emailTaken.id !== command.principalId) {
			throwIdentityError(
				"IDN_PRINCIPAL_EMAIL_TAKEN",
				"Email already registered",
			);
		}
		const principal = await context.principalRepository.updateEmail(
			command.principalId,
			command.email,
		);
		if (!principal) {
			throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
		}
		await context.publishEvents([
			createPrincipalEmailUpdatedEvent({
				principalId: principal.id,
				email: principal.email,
			}),
		]);
		return principal;
	});
}
