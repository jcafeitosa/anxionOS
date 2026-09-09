import { reactivatePrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import { createPrincipalReactivatedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface ReactivatePrincipalInput {
	principalId: string;
	actorPrincipalId?: string;
}

export interface ReactivatePrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

export async function reactivatePrincipal(
	deps: ReactivatePrincipalDeps,
	input: ReactivatePrincipalInput,
): Promise<Principal> {
	const command = reactivatePrincipalCommandSchema.parse(input);
	const existing = await deps.repository.findById(command.principalId);
	if (!existing) {
		throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
	}
	if (existing.status === "active") {
		return existing;
	}
	const reactivatedAt = new Date();
	return deps.unitOfWork.runInTransaction(async (context) => {
		const principal = await context.principalRepository.reactivate(command.principalId);
		if (!principal) {
			throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
		}
		await context.publishEvents([
			createPrincipalReactivatedEvent({
				principalId: principal.id,
				reactivatedAt: reactivatedAt.toISOString(),
				actorPrincipalId: command.actorPrincipalId,
			}),
		]);
		return principal;
	});
}
