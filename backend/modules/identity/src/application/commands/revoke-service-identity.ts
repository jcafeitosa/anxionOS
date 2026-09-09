import { revokeServiceIdentityCommandSchema } from "@anxionos/contracts/identity";
import type { ServiceIdentity } from "../../domain/entities/service-identity";
import { createServiceIdentityRevokedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";
import { throwIdentityError } from "../errors";

export interface RevokeServiceIdentityDeps {
	serviceIdentityRepository: ServiceIdentityRepository;
	unitOfWork: IdentityUnitOfWork;
}

export async function revokeServiceIdentity(
	deps: RevokeServiceIdentityDeps,
	input: { serviceIdentityId: string },
): Promise<ServiceIdentity> {
	const command = revokeServiceIdentityCommandSchema.parse(input);
	const existing = await deps.serviceIdentityRepository.findById(command.serviceIdentityId);
	if (!existing) {
		throwIdentityError("SERVICE_IDENTITY_NOT_FOUND", "Service identity not found");
	}
	if (existing.status === "revoked") {
		return existing;
	}
	const revokedAt = new Date();
	return deps.unitOfWork.runInTransaction(async (context) => {
		const serviceIdentity = await context.serviceIdentityRepository.revoke(
			command.serviceIdentityId,
			revokedAt,
		);
		if (!serviceIdentity) {
			throwIdentityError("SERVICE_IDENTITY_NOT_FOUND", "Service identity not found");
		}
		await context.publishEvents([
			createServiceIdentityRevokedEvent({
				serviceIdentityId: serviceIdentity.id,
				principalId: serviceIdentity.principalId,
				revokedAt: revokedAt.toISOString(),
			}),
		]);
		return serviceIdentity;
	});
}
