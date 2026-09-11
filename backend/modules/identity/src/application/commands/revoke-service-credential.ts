import type { ServiceCredentialDto } from "@anxionos/contracts/identity";
import { revokeServiceCredentialCommandSchema } from "@anxionos/contracts/identity";
import { createServiceCredentialRevokedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import { throwIdentityError } from "../errors";
import { toServiceCredentialDto } from "../presenters";

export interface RevokeServiceCredentialInput {
	credentialId: string;
	reasonCode?: string;
	commandId?: string;
}

export interface RevokeServiceCredentialDeps {
	serviceCredentialRepository: ServiceCredentialRepository;
	unitOfWork: IdentityUnitOfWork;
}

/** Revoking an already-revoked credential is idempotent (no second event). */
export async function revokeServiceCredential(
	deps: RevokeServiceCredentialDeps,
	input: RevokeServiceCredentialInput,
): Promise<ServiceCredentialDto> {
	const command = revokeServiceCredentialCommandSchema.parse(input);

	const existing = await deps.serviceCredentialRepository.findById(
		command.credentialId,
	);
	if (!existing) {
		throwIdentityError("IDN_CREDENTIAL_NOT_FOUND", "Credential not found");
	}
	if (existing.status === "revoked") {
		return toServiceCredentialDto(existing);
	}

	const revokedAt = new Date();
	return deps.unitOfWork.runInTransaction(async (context) => {
		const revoked = await context.serviceCredentialRepository.revoke(
			command.credentialId,
			revokedAt,
		);
		if (!revoked) {
			// Lost a concurrent race: an already-revoked credential is success.
			const current = await context.serviceCredentialRepository.findById(
				command.credentialId,
			);
			if (current?.status === "revoked") {
				return toServiceCredentialDto(current);
			}
			throwIdentityError("IDN_CREDENTIAL_NOT_FOUND", "Credential not found");
		}
		await context.publishEvents([
			createServiceCredentialRevokedEvent({
				credentialId: revoked.id,
				serviceIdentityId: revoked.serviceIdentityId,
				revokedAt: revokedAt.toISOString(),
			}),
		]);
		return toServiceCredentialDto(revoked);
	});
}
