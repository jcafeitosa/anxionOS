import { revokeServiceIdentityCommandSchema } from "@anxionos/contracts/identity";
import type { ServiceIdentity } from "../../domain/entities/service-identity";
import {
	createServiceCredentialRevokedEvent,
	createServiceIdentityRevokedEvent,
} from "../../domain/events/identity-events";
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
	const existing = await deps.serviceIdentityRepository.findById(
		command.serviceIdentityId,
	);
	if (!existing) {
		throwIdentityError(
			"IDN_SERVICE_IDENTITY_NOT_FOUND",
			"Service identity not found",
		);
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
			// Lost a concurrent race: an already-revoked identity is an
			// idempotent success, not a 404.
			const current = await context.serviceIdentityRepository.findById(
				command.serviceIdentityId,
			);
			if (current?.status === "revoked") {
				return current;
			}
			throwIdentityError(
				"IDN_SERVICE_IDENTITY_NOT_FOUND",
				"Service identity not found",
			);
		}
		const events = [
			createServiceIdentityRevokedEvent({
				serviceIdentityId: serviceIdentity.id,
				principalId: serviceIdentity.principalId,
				revokedAt: revokedAt.toISOString(),
			}),
		];
		// Revoking the identity must invalidate the credentials it can present.
		const revokedCredentials =
			await context.serviceCredentialRepository.revokeActiveByServiceIdentityId(
				serviceIdentity.id,
				revokedAt,
			);
		for (const credential of revokedCredentials) {
			events.push(
				createServiceCredentialRevokedEvent({
					credentialId: credential.id,
					serviceIdentityId: credential.serviceIdentityId,
					revokedAt: revokedAt.toISOString(),
				}),
			);
		}
		await context.publishEvents(events);
		return serviceIdentity;
	});
}
