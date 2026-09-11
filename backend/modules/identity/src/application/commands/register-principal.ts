import { registerPrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal, PrincipalKind } from "../../domain/entities/principal";
import { createPrincipalRegisteredEvent } from "../../domain/events/identity-events";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";
import { findIdempotentCommand, recordIdempotentCommand } from "../idempotency";

export interface RegisterPrincipalInput {
	authUserId: string;
	email: string;
	kind?: PrincipalKind;
	commandId?: string;
}

export interface RegisterPrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

/**
 * Replay de um principal que nao esta mais ativo falha FECHADO com o mesmo
 * codigo da leitura publica (`getPrincipalById`, D-IDN-008/INV-IDN-01). Antes,
 * re-registrar um `authUserId` suspenso/revogado devolvia 200 com o DTO
 * (inclusive e-mail) enquanto `GET /principals/:id` devolvia 404 — assimetria
 * apontada como F5 pela revalidacao G4.
 */
function assertReplayable(principal: Principal): Principal {
	if (principal.status !== "active") {
		throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
	}
	return principal;
}

/**
 * D-IDN-006: idempotent by `authUserId` — a repeated registration returns the
 * existing principal and emits no second event. R04 additionally materializes
 * an `Idempotency-Key` as `commandId` in the journal when the caller provides one.
 */
export async function registerPrincipal(
	deps: RegisterPrincipalDeps,
	input: RegisterPrincipalInput,
): Promise<Principal> {
	const command = registerPrincipalCommandSchema.parse(input);
	const existing = await deps.repository.findByAuthUserId(command.authUserId);
	if (existing) {
		return assertReplayable(existing);
	}
	return deps.unitOfWork.runInTransaction(async (context) => {
		if (command.commandId) {
			// A create has no aggregate id yet: validate the intent against the
			// principal the journal points to (same authUserId == same command).
			const journaled = await findIdempotentCommand(context.commandJournal, {
				commandId: command.commandId,
				commandName: "RegisterPrincipal",
				matchesAggregate: async (aggregateId) => {
					const replayed =
						await context.principalRepository.findById(aggregateId);
					return replayed?.authUserId === command.authUserId;
				},
			});
			if (journaled) {
				const replayed = await context.principalRepository.findById(
					journaled.aggregateId,
				);
				if (replayed) {
					// D-IDN-041: TODO caminho de replay falha fechado para
					// principal nao-ativo — inclusive o replay pelo journal
					// (achado N2 da revalidacao G2).
					return assertReplayable(replayed);
				}
			}
		}
		const raced = await context.principalRepository.findByAuthUserId(
			command.authUserId,
		);
		if (raced) {
			return assertReplayable(raced);
		}
		const emailTaken = await context.principalRepository.findByEmail(
			command.email,
		);
		if (emailTaken) {
			// A corrida pode commitar o vencedor ENTRE as duas leituras: se a linha
			// que ocupa o e-mail e a MESMA intencao (mesmo authUserId), isso e o
			// replay do nosso proprio registro, nao e-mail de terceiro.
			if (emailTaken.authUserId === command.authUserId) {
				return assertReplayable(emailTaken);
			}
			throwIdentityError(
				"IDN_PRINCIPAL_EMAIL_TAKEN",
				"Email already registered",
			);
		}
		// Insert tolerante a conflito: NAO aborta a transacao com 23505. Se o
		// vencedor da corrida ja commitou, `null` volta e resolvemos por releitura
		// (o INSERT ON CONFLICT espera o desfecho do concorrente antes de decidir).
		const created = await context.principalRepository.createIfAbsent({
			authUserId: command.authUserId,
			email: command.email,
			kind: command.kind ?? "human",
		});
		if (!created) {
			const racedAuthUser = await context.principalRepository.findByAuthUserId(
				command.authUserId,
			);
			if (racedAuthUser) {
				// Mesma intencao (mesmo authUserId): replay idempotente.
				return assertReplayable(racedAuthUser);
			}
			const racedEmail = await context.principalRepository.findByEmail(
				command.email,
			);
			if (racedEmail) {
				if (racedEmail.authUserId === command.authUserId) {
					return assertReplayable(racedEmail);
				}
				throwIdentityError(
					"IDN_PRINCIPAL_EMAIL_TAKEN",
					"Email already registered",
				);
			}
			throwIdentityError(
				"IDN_DUPLICATE_IDEMPOTENCY",
				"Concurrent registration with the same idempotency key",
			);
		}
		const principal = created;
		await context.publishEvents([
			createPrincipalRegisteredEvent({
				principalId: principal.id,
				email: principal.email,
				kind: principal.kind,
				revision: principal.revision,
			}),
		]);
		if (command.commandId) {
			await recordIdempotentCommand(context, {
				commandId: command.commandId,
				commandName: "RegisterPrincipal",
				aggregateId: principal.id,
				aggregateType: "Principal",
				revision: principal.revision,
				responseSnapshot: {
					aggregateId: principal.id,
					revision: principal.revision,
					status: principal.status,
				},
			});
		}
		return principal;
	});
}
