import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { suspendPrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import {
	createPrincipalSuspendedEvent,
	createServiceIdentityRevokedEvent,
} from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type { SessionRevoker } from "../../domain/ports/session-revoker";
import { SessionRevocationUnavailableError } from "../../domain/ports/session-revoker";
import { throwIdentityError } from "../errors";

export interface SuspendPrincipalInput {
	principalId: string;
	reasonCode: string;
	actorPrincipalId?: string;
}

export interface SuspendPrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
	/** ANX-235: inline revoke closes session window when NATS consumer is disabled. */
	sessionRevoker?: SessionRevoker;
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
			const events: DomainEventEnvelope[] = [
				createPrincipalSuspendedEvent({
					principalId: principal.id,
					reasonCode: command.reasonCode,
					suspendedAt: suspendedAt.toISOString(),
				}),
			];
			const activeServiceIdentities =
				await context.serviceIdentityRepository.findActiveByPrincipalId(
					principal.id,
				);
			for (const serviceIdentity of activeServiceIdentities) {
				const revoked = await context.serviceIdentityRepository.revoke(
					serviceIdentity.id,
					suspendedAt,
				);
				if (revoked) {
					events.push(
						createServiceIdentityRevokedEvent({
							serviceIdentityId: revoked.id,
							principalId: revoked.principalId,
							revokedAt: suspendedAt.toISOString(),
						}),
					);
				}
			}
			await context.publishEvents(events);
			if (deps.sessionRevoker) {
				try {
					await deps.sessionRevoker.revokeAllForAuthUser(principal.authUserId);
				} catch (error) {
					throw new SessionRevocationUnavailableError(
						"Failed to revoke sessions during suspend",
						{ cause: error },
					);
				}
			}
			return principal;
		}
		const existing = await context.principalRepository.findById(
			command.principalId,
		);
		if (!existing) {
			throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
		}
		if (existing.status === "suspended") {
			return existing;
		}
		throwIdentityError("PRINCIPAL_NOT_FOUND", "Principal not found");
	});
}
