import type { ServiceCredentialDto } from "@anxionos/contracts/identity";
import { revokeServiceCredentialCommandSchema } from "@anxionos/contracts/identity";
import { createServiceCredentialRevokedEvent } from "../../domain/events/identity-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import { throwIdentityError } from "../errors";
import { findIdempotentCommand, recordIdempotentCommand } from "../idempotency";
import { toServiceCredentialDto } from "../presenters";

export interface RevokeServiceCredentialInput {
	credentialId: string;
	reasonCode?: string;
	commandId?: string;
}

export interface RevokeServiceCredentialDeps {
	commandJournal: CommandJournalRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	unitOfWork: IdentityUnitOfWork;
}

/** Revoking an already-revoked credential is idempotent (no second event). */
export async function revokeServiceCredential(
	deps: RevokeServiceCredentialDeps,
	input: RevokeServiceCredentialInput,
): Promise<ServiceCredentialDto> {
	const command = revokeServiceCredentialCommandSchema.parse(input);

	if (command.commandId) {
		// O agregado e' a credencial: reusar a key de OUTRO comando/credencial e'
		// conflito, nao replay (achado LOW do G5: a key era aceita e ignorada).
		const journaled = await findIdempotentCommand(deps.commandJournal, {
			commandId: command.commandId,
			commandName: "RevokeServiceCredential",
			aggregateId: command.credentialId,
		});
		if (journaled) {
			const replayed = await deps.serviceCredentialRepository.findById(
				journaled.aggregateId,
			);
			if (replayed) {
				return toServiceCredentialDto(replayed);
			}
		}
	}

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
		if (command.commandId) {
			await recordIdempotentCommand(context, {
				commandId: command.commandId,
				commandName: "RevokeServiceCredential",
				aggregateId: revoked.id,
				aggregateType: "ServiceCredential",
				revision: 1,
				responseSnapshot: {
					aggregateId: revoked.id,
					revision: 1,
					status: revoked.status,
				},
			});
		}
		return toServiceCredentialDto(revoked);
	});
}
