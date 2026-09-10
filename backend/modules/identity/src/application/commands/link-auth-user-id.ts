import { linkAuthUserIdCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import { createPrincipalAuthLinkedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface LinkAuthUserIdInput {
	principalId: string;
	authUserId: string;
}

export interface LinkAuthUserIdDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

export async function linkAuthUserId(
	deps: LinkAuthUserIdDeps,
	input: LinkAuthUserIdInput,
): Promise<Principal> {
	const command = linkAuthUserIdCommandSchema.parse(input);
	const existing = await deps.repository.findById(command.principalId);
	if (!existing) {
		throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
	}
	if (existing.authUserId === command.authUserId) {
		return existing;
	}
	const authUserTaken = await deps.repository.findByAuthUserId(
		command.authUserId,
	);
	if (authUserTaken && authUserTaken.id !== command.principalId) {
		throwIdentityError(
			"PRINCIPAL_AUTH_USER_TAKEN",
			"Auth user already linked to another principal",
		);
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const principal = await context.principalRepository.linkAuthUserId(
			command.principalId,
			command.authUserId,
		);
		if (!principal) {
			throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
		}
		await context.publishEvents([
			createPrincipalAuthLinkedEvent({
				principalId: principal.id,
			}),
		]);
		return principal;
	});
}
