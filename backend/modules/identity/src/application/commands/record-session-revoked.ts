import type { SessionRefDto } from "@anxionos/contracts/identity";
import { recordSessionRevokedCommandSchema } from "@anxionos/contracts/identity";
import { createSessionRevokedEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type { SessionRefRepository } from "../../domain/ports/session-ref-repository";
import { throwIdentityError } from "../errors";
import { findIdempotentCommand, recordIdempotentCommand } from "../idempotency";
import { toSessionRefDto } from "../presenters";

export interface RecordSessionRevokedInput {
	principalId: string;
	sessionRefId: string;
	/** Required only when this reference is not known to the module yet. */
	externalRefHash?: string;
	revokedAt?: string;
	reasonCode?: string;
	commandId?: string;
}

export interface RecordSessionRevokedDeps {
	principalRepository: PrincipalRepository;
	sessionRefRepository: SessionRefRepository;
	unitOfWork: IdentityUnitOfWork;
}

export interface RecordSessionRevokedResult {
	sessionRef: SessionRefDto;
	/** False when the reference was already revoked (idempotent no-op). */
	transitioned: boolean;
}

/**
 * R03 `RecordSessionRevoked`: records a revocation learned from the session
 * owner. The event carries the logical `sessionRefId` — never a token, cookie
 * or raw session id (INV-IDN-03).
 */
export async function recordSessionRevoked(
	deps: RecordSessionRevokedDeps,
	input: RecordSessionRevokedInput,
): Promise<RecordSessionRevokedResult> {
	const command = recordSessionRevokedCommandSchema.parse(input);
	const revokedAt = command.revokedAt
		? new Date(command.revokedAt)
		: new Date();

	const principal = await deps.principalRepository.findById(
		command.principalId,
	);
	if (!principal) {
		throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
	}

	// Os dois atalhos de sucesso ("ja revogada" e replay do journal) vivem DENTRO
	// da transacao e DEPOIS da checagem de intencao: um early-return antes dela
	// respondia 200 a reuso de key em OUTRO sessionRef ja revogado, mascarando o
	// conflito IDN_DUPLICATE_IDEMPOTENCY (achado MEDIUM do G2).
	return deps.unitOfWork.runInTransaction(async (context) => {
		if (command.commandId) {
			// The aggregate IS the session reference: reusing the key for another
			// session must be a conflict, not a replay of the wrong session.
			const journaled = await findIdempotentCommand(context.commandJournal, {
				commandId: command.commandId,
				commandName: "RecordSessionRevoked",
				aggregateId: command.sessionRefId,
			});
			if (journaled) {
				const replayed = await context.sessionRefRepository.findById(
					journaled.aggregateId,
				);
				if (replayed) {
					return {
						sessionRef: toSessionRefDto(replayed),
						transitioned: false,
					};
				}
			}
		}
		const existing = await context.sessionRefRepository.findById(
			command.sessionRefId,
		);
		if (existing?.status === "revoked") {
			return { sessionRef: toSessionRefDto(existing), transitioned: false };
		}
		if (!existing && !command.externalRefHash) {
			throwIdentityError(
				"IDN_SESSION_NOT_FOUND",
				"Unknown session reference requires externalRefHash",
			);
		}
		const recorded = existing
			? await context.sessionRefRepository.revoke(
					command.sessionRefId,
					revokedAt,
					command.reasonCode ?? null,
				)
			: await context.sessionRefRepository.recordRevoked({
					id: command.sessionRefId,
					principalId: command.principalId,
					externalRefHash: command.externalRefHash as string,
					revokedAt,
					reasonCode: command.reasonCode ?? null,
				});
		if (!recorded) {
			// Concurrent revocation already applied it: idempotent success.
			const current = await context.sessionRefRepository.findById(
				command.sessionRefId,
			);
			if (current) {
				return { sessionRef: toSessionRefDto(current), transitioned: false };
			}
			throwIdentityError(
				"IDN_SESSION_NOT_FOUND",
				"Session reference not found",
			);
		}
		await context.publishEvents([
			createSessionRevokedEvent({
				sessionRefId: recorded.id,
				principalId: recorded.principalId,
				revokedAt: (recorded.revokedAt ?? revokedAt).toISOString(),
				reasonCode: command.reasonCode,
			}),
		]);
		if (command.commandId) {
			await recordIdempotentCommand(context, {
				commandId: command.commandId,
				commandName: "RecordSessionRevoked",
				aggregateId: recorded.id,
				aggregateType: "SessionRef",
				revision: 1,
				responseSnapshot: {
					aggregateId: recorded.id,
					revision: 1,
					status: recorded.status,
				},
			});
		}
		return { sessionRef: toSessionRefDto(recorded), transitioned: true };
	});
}
