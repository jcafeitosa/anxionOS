import { suspendPrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import { createPrincipalSuspendedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface SuspendPrincipalInput {
	principalId: string;
	reasonCode: string;
	actorPrincipalId?: string;
}

export interface SuspendPrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

export async function suspendPrincipal(
	deps: SuspendPrincipalDeps,
	input: SuspendPrincipalInput,
): Promise<Principal> {
	const command = suspendPrincipalCommandSchema.parse(input);
	const suspendedAt = new Date();
	return deps.unitOfWork.runInTransaction(async (context) => {
		const principal = await context.principalRepository.markSuspended(
			command.principalId,
			command.reasonCode,
			suspendedAt,
		);
		if (principal) {
			await context.publishEvents([
				createPrincipalSuspendedEvent({
					principalId: principal.id,
					reasonCode: command.reasonCode,
					suspendedAt: suspendedAt.toISOString(),
				}),
			]);
			return principal;
		}
		const existing = await context.principalRepository.findById(command.principalId);
		if (!existing) {
			throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
		}
		if (existing.status === "suspended") {
			return existing;
		}
		throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
	});
}
