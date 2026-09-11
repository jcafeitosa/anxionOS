import type { ServiceCredentialDto } from "@anxionos/contracts/identity";
import { issueServiceCredentialCommandSchema } from "@anxionos/contracts/identity";
import { createServiceCredentialIssuedEvent } from "../../domain/events/identity-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "../../domain/ports/identity-unit-of-work";
import type { ServiceCredentialCrypto } from "../../domain/ports/service-credential-crypto";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";
import { isUniqueViolation, throwIdentityError } from "../errors";
import { findIdempotentCommand, recordIdempotentCommand } from "../idempotency";
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
		const journaled = await findIdempotentCommand(deps.commandJournal, {
			commandId: command.commandId,
			commandName: "IssueServiceCredential",
			matchesAggregate: async (aggregateId) => {
				const existing =
					await deps.serviceCredentialRepository.findById(aggregateId);
				return existing?.serviceIdentityId === command.serviceIdentityId;
			},
		});
		if (journaled) {
			const existing = await deps.serviceCredentialRepository.findById(
				journaled.aggregateId,
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

	const generated = await deps.crypto.generate();
	const issuedAt = new Date();
	const credential = await deps.unitOfWork.runInTransaction(async (context) => {
		// O unico indice unico desta tabela e o prefixo: 23505 aqui significa
		// colisao de prefixo (probabilidade 36^-9), nao duplicata de idempotencia.
		// Nao ha retry dentro da transacao (em PG o erro a aborta); o chamador
		// repete com um commandId novo.
		const created = await createCredentialOrFail(context, {
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
			await recordIdempotentCommand(context, {
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

/** Maps a prefix collision (unique index) to a typed, client-actionable error. */
async function createCredentialOrFail(
	context: IdentityTransactionContext,
	input: Parameters<
		IdentityTransactionContext["serviceCredentialRepository"]["create"]
	>[0],
) {
	try {
		return await context.serviceCredentialRepository.create(input);
	} catch (error) {
		if (isUniqueViolation(error)) {
			throwIdentityError(
				"IDN_CREDENTIAL_PREFIX_TAKEN",
				"Credential prefix collision — retry with a new commandId",
			);
		}
		throw error;
	}
}
