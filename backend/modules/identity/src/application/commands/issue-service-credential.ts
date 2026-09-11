import type { ServiceCredentialDto } from "@anxionos/contracts/identity";
import { issueServiceCredentialCommandSchema } from "@anxionos/contracts/identity";
import { createServiceCredentialIssuedEvent } from "../../domain/events/identity-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { ServiceCredentialCrypto } from "../../domain/ports/service-credential-crypto";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";
import { throwIdentityError } from "../errors";
import { toServiceCredentialDto } from "../presenters";

export interface IssueServiceCredentialInput {
	serviceIdentityId: string;
	expiresAt?: string;
	commandId?: string;
}

export interface IssueServiceCredentialDeps {
	serviceIdentityRepository: ServiceIdentityRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	commandJournal: CommandJournalRepository;
	unitOfWork: IdentityUnitOfWork;
	crypto: ServiceCredentialCrypto;
}

export interface IssueServiceCredentialResult {
	credential: ServiceCredentialDto;
	/**
	 * Plaintext key (`<prefix>.<secret>`), returned **once** at issuance. It is
	 * never persisted, published in an event, logged or written to the graph.
	 * Empty on an idempotent replay — the original cannot be recovered.
	 */
	secret: string;
	idempotentReplay: boolean;
}

/**
 * R03 ServiceCredentialRef issuance: only the scrypt hash is stored. A replay by
 * `commandId` never reissues a secret; the caller must rotate instead.
 */
export async function issueServiceCredential(
	deps: IssueServiceCredentialDeps,
	input: IssueServiceCredentialInput,
): Promise<IssueServiceCredentialResult> {
	const command = issueServiceCredentialCommandSchema.parse(input);

	if (command.commandId) {
		const journaled = await deps.commandJournal.findByCommandId(
			command.commandId,
		);
		if (journaled) {
			const existing = await deps.serviceCredentialRepository.findById(
				String(journaled.aggregateId),
			);
			if (existing) {
				return {
					credential: toServiceCredentialDto(existing),
					secret: "",
					idempotentReplay: true,
				};
			}
		}
	}

	const serviceIdentity = await deps.serviceIdentityRepository.findById(
		command.serviceIdentityId,
	);
	if (!serviceIdentity) {
		throwIdentityError(
			"IDN_SERVICE_IDENTITY_NOT_FOUND",
			"Service identity not found",
		);
	}
	if (serviceIdentity.status === "revoked") {
		throwIdentityError(
			"IDN_SERVICE_IDENTITY_ALREADY_REVOKED",
			"Service identity is revoked",
		);
	}

	const generated = deps.crypto.generate();
	const issuedAt = new Date();
	const credential = await deps.unitOfWork.runInTransaction(async (context) => {
		const created = await context.serviceCredentialRepository.create({
			serviceIdentityId: command.serviceIdentityId,
			prefix: generated.prefix,
			secretHash: generated.secretHash,
			expiresAt: command.expiresAt ? new Date(command.expiresAt) : null,
		});
		await context.publishEvents([
			createServiceCredentialIssuedEvent({
				credentialId: created.id,
				serviceIdentityId: command.serviceIdentityId,
				principalId: serviceIdentity.principalId,
				prefix: created.prefix,
				issuedAt: issuedAt.toISOString(),
			}),
		]);
		if (command.commandId) {
			await context.commandJournal.record({
				commandId: command.commandId,
				commandName: "IssueServiceCredential",
				aggregateId: created.id,
				aggregateType: "ServiceCredential",
				revision: 1,
				responseSnapshot: {
					aggregateId: created.id,
					revision: 1,
					status: created.status,
				},
			});
		}
		return created;
	});

	return {
		credential: toServiceCredentialDto(credential),
		secret: `${generated.prefix}.${generated.secret}`,
		idempotentReplay: false,
	};
}
