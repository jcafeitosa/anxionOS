import { registerServiceIdentityCommandSchema } from "@anxionos/contracts/identity";
import type { ServiceIdentity } from "../../domain/entities/service-identity";
import { createServiceIdentityRegisteredEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";

export interface RegisterServiceIdentityDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

export async function registerServiceIdentity(
	deps: RegisterServiceIdentityDeps,
	input: { principalId: string; label: string },
): Promise<ServiceIdentity> {
	const command = registerServiceIdentityCommandSchema.parse(input);
	const principal = await deps.repository.findById(command.principalId);
	if (!principal || principal.status !== "active") {
		throwIdentityError("PRINCIPAL_NOT_FOUND", "Active principal not found");
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		const serviceIdentity = await context.serviceIdentityRepository.create({
			principalId: command.principalId,
			label: command.label,
		});
		await context.publishEvents([
			createServiceIdentityRegisteredEvent({
				serviceIdentityId: serviceIdentity.id,
				principalId: serviceIdentity.principalId,
				label: serviceIdentity.label,
			}),
		]);
		return serviceIdentity;
	});
}
