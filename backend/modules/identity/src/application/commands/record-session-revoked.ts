import type { SessionRefDto } from "@anxionos/contracts/identity";
import { recordSessionRevokedCommandSchema } from "@anxionos/contracts/identity";
import type { SessionRef } from "../../domain/entities/session-ref";
import { createSessionRevokedEvent } from "../../domain/events/identity-events";
import type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "../../domain/ports/identity-unit-of-work";
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
 * ANX-467: a posse da `SessionRef` e' invariante do AGREGADO, nao do caminho de
 * resolucao. Por id, por hash (`recordRevoked`) ou pelo replay do journal, uma
 * referencia que pertence a outro `principalId` responde o MESMO 404 opaco de
 * D-IDN-043. Devolver `IDN_CROSS_TENANT` confirmaria a existencia da referencia
 * e o vinculo com terceiro; o controle de objeto nao pode depender de sigilo.
 */
function assertSessionOwnership(
	session: SessionRef,
	principalId: string,
): void {
	if (session.principalId !== principalId) {
		throwIdentityError("IDN_SESSION_NOT_FOUND", "Session reference not found");
	}
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
	//
	// O no-op TAMBEM grava o journal (achado bloqueante da revalidacao G2): sem
	// isso, se a PRIMEIRA usagem da key cai no atalho de "ja revogada", a key
	// nunca existe no journal e o reuso posterior escapa da checagem de intencao
	// — a mesma key produzia efeito em dois agregados (refX no-op, refZ novo).
	const journalNoOp = async (
		context: IdentityTransactionContext,
		aggregateId: string,
		status: string,
	): Promise<void> => {
		if (!command.commandId) {
			return;
		}
		await recordIdempotentCommand(context, {
			commandId: command.commandId,
			commandName: "RecordSessionRevoked",
			aggregateId,
			aggregateType: "SessionRef",
			revision: 1,
			responseSnapshot: { aggregateId, revision: 1, status },
		});
	};

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
					// ANX-467 (3o caminho): o replay do journal resolve a referencia
					// por id. Sem validar a posse aqui, conhecer a `Idempotency-Key`
					// de terceiro devolvia o DTO da sessao alheia.
					assertSessionOwnership(replayed, command.principalId);
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
		// IDOR (HIGH da revalidacao G5): a autorizacao da borda e' feita contra o
		// `principalId` DECLARADO pelo chamador (self-access), mas o agregado e' a
		// sessionRef. Sem esta checagem, qualquer autenticado revogava a sessao de
		// OUTRO principal apenas conhecendo o UUID da referencia — o controle de
		// objeto nao pode depender de sigilo de UUID. Resposta opaca de proposito:
		// nao revela que a referencia existe e pertence a terceiro.
		if (existing) {
			assertSessionOwnership(existing, command.principalId);
		}
		if (existing?.status === "revoked") {
			await journalNoOp(context, existing.id, existing.status);
			return { sessionRef: toSessionRefDto(existing), transitioned: false };
		}
		if (!existing && !command.externalRefHash) {
			throwIdentityError(
				"IDN_SESSION_NOT_FOUND",
				"Unknown session reference requires externalRefHash",
			);
		}
		// ANX-467 (2o caminho): a referencia desconhecida por id e' resolvida por
		// hash DENTRO de `recordRevoked`, que revogaria a linha de OUTRO principal
		// (self-access com id arbitrario + hash da vitima -> 200 e vítima
		// `active->revoked`). A posse e' validada ANTES da transicao, com o mesmo
		// 404 opaco: o segredo do hash nao substitui a checagem de objeto.
		if (!existing && command.externalRefHash) {
			const byHash = await context.sessionRefRepository.findByExternalRefHash(
				command.externalRefHash,
			);
			if (byHash) {
				assertSessionOwnership(byHash, command.principalId);
			}
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
				await journalNoOp(context, current.id, current.status);
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
