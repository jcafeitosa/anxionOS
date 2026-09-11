import { rotateServiceCredentialCommandSchema } from "@anxionos/contracts/identity";
import { createServiceCredentialRotatedEvent } from "../../domain/events/identity-events";
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

export interface RotateServiceCredentialInput {
	serviceIdentityId: string;
	expiresAt?: string;
	commandId?: string;
}

export interface RotateServiceCredentialDeps {
	serviceIdentityRepository: ServiceIdentityRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	commandJournal: CommandJournalRepository;
	unitOfWork: IdentityUnitOfWork;
	crypto: ServiceCredentialCrypto;
}

export interface RotateServiceCredentialResult {
	/** The newly issued credential — the only one that is valid afterwards. */
	credential: ReturnType<typeof toServiceCredentialDto>;
	secret: string;
	/** Credentials superseded by this rotation. */
	replacedCredentialIds: string[];
	/** True quando o commandId ja havia sido processado (nada e rotacionado de novo). */
	idempotentReplay: boolean;
}

/**
 * Rotation replaces every active credential of the service identity: the new
 * key is issued and each previous one becomes `rotated` in the same
 * transaction, so there is no window with two valid keys.
 */
export async function rotateServiceCredential(
	deps: RotateServiceCredentialDeps,
	input: RotateServiceCredentialInput,
): Promise<RotateServiceCredentialResult> {
	const command = rotateServiceCredentialCommandSchema.parse(input);

	if (command.commandId) {
		const journaled = await findIdempotentCommand(deps.commandJournal, {
			commandId: command.commandId,
			commandName: "RotateServiceCredential",
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
					replacedCredentialIds: [],
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

	const active =
		await deps.serviceCredentialRepository.findActiveByServiceIdentityId(
			command.serviceIdentityId,
		);
	if (active.length === 0) {
		throwIdentityError(
			"IDN_CREDENTIAL_NOT_FOUND",
			"No active credential to rotate",
		);
	}

	const generated = await deps.crypto.generate();
	const rotatedAt = new Date();
	const rotated = await deps.unitOfWork.runInTransaction(async (context) => {
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
		const events = [];
		const replaced: string[] = [];
		for (const previous of active) {
			const superseded = await context.serviceCredentialRepository.markRotated(
				previous.id,
				created.id,
				rotatedAt,
			);
			if (!superseded) {
				continue;
			}
			replaced.push(superseded.id);
			events.push(
				createServiceCredentialRotatedEvent({
					credentialId: created.id,
					previousCredentialId: superseded.id,
					serviceIdentityId: superseded.serviceIdentityId,
					prefix: created.prefix,
					rotatedAt: rotatedAt.toISOString(),
				}),
			);
		}
		await context.publishEvents(events);
		if (command.commandId) {
			// `created.id` e novo NESTA transacao, entao "already-recorded" e
			// inalcancavel: uma key concorrente aponta para OUTRO credencial e
			// `recordIdempotentCommand` lanca IDN_DUPLICATE_IDEMPOTENCY (mesma
			// semantica de suspend/revoke). Nao ha ramo morto a manter.
			await recordIdempotentCommand(context, {
				commandId: command.commandId,
				commandName: "RotateServiceCredential",
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
		return { created, replaced };
	});

	return {
		credential: toServiceCredentialDto(rotated.created),
		secret: `${generated.prefix}.${generated.secret}`,
		replacedCredentialIds: rotated.replaced,
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
