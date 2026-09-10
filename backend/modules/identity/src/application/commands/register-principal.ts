import { registerPrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import { createPrincipalRegisteredEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface RegisterPrincipalInput {
	authUserId: string;
	email: string;
}

export interface RegisterPrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

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
			throwIdentityError("PRINCIPAL_EMAIL_TAKEN", "Email already registered");
		}
		const principal = await context.principalRepository.create({
			authUserId: command.authUserId,
			email: command.email,
		});
		await context.publishEvents([
			createPrincipalRegisteredEvent({
				principalId: principal.id,
				email: principal.email,
			}),
		]);
		return principal;
	});
}
