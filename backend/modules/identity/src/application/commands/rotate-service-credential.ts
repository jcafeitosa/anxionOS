import { rotateServiceCredentialCommandSchema } from "@anxionos/contracts/identity";
import { createServiceCredentialRotatedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { ServiceCredentialCrypto } from "../../domain/ports/service-credential-crypto";
import type { ServiceCredentialRepository } from "../../domain/ports/service-credential-repository";
import type { ServiceIdentityRepository } from "../../domain/ports/service-identity-repository";
import { throwIdentityError } from "../errors";
import { toServiceCredentialDto } from "../presenters";

export interface RotateServiceCredentialInput {
	serviceIdentityId: string;
	expiresAt?: string;
	commandId?: string;
}

export interface RotateServiceCredentialDeps {
	serviceIdentityRepository: ServiceIdentityRepository;
	serviceCredentialRepository: ServiceCredentialRepository;
	unitOfWork: IdentityUnitOfWork;
	crypto: ServiceCredentialCrypto;
}

export interface RotateServiceCredentialResult {
	/** The newly issued credential — the only one that is valid afterwards. */
	credential: ReturnType<typeof toServiceCredentialDto>;
	secret: string;
	/** Credentials superseded by this rotation. */
	replacedCredentialIds: string[];
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

	const generated = deps.crypto.generate();
	const rotatedAt = new Date();
	const rotated = await deps.unitOfWork.runInTransaction(async (context) => {
		const created = await context.serviceCredentialRepository.create({
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
		return { created, replaced };
	});

	return {
		credential: toServiceCredentialDto(rotated.created),
		secret: `${generated.prefix}.${generated.secret}`,
		replacedCredentialIds: rotated.replaced,
	};
}
