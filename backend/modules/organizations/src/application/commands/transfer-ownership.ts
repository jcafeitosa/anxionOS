import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	commandResultSchema,
	type TransferOwnershipCommand,
	transferOwnershipCommandSchema,
} from "@anxionos/contracts/organizations";
import { createOwnershipTransferredEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	recordOrganizationCommand,
	saveWithRevisionConflictMapping,
	toCommandResultSnapshot,
} from "../command-support";
import { throwOrganizationError } from "../errors";
import { buildAgencyTenantContext } from "../services/tenant-context";
export async function transferOwnership(
	deps: TransferOwnershipDeps,
	input: TransferOwnershipInput,
): Promise<CommandResult> {
	const command = transferOwnershipCommandSchema.parse(input);
	const intent = {
		commandName: "TransferOwnership",
		aggregateId: command.agencyId,
		requestHash: hashCommandPayload({
			agencyId: command.agencyId,
			newOwnerPrincipalId: command.newOwnerPrincipalId,
			actorPrincipalId: input.actorPrincipalId,
		}),
	};
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
		intent,
	);
	if (replay) {
		return replay;
	}
	// G5-F1/G4-F1 — a existencia do SUCESSOR nao e' verificada aqui, fora da
	// transacao: `newOwnerPrincipalId` e' 100% controlado pelo cliente e
	// `identity_principals` nao tem RLS, entao um 404 de "principal inexistente"
	// ANTES da checagem de autoridade virava oraculo de existencia global de
	// principal (404 = nao existe, 403/409 = existe) para qualquer owner/admin de
	// qualquer agency self-serve. A verificacao agora acontece DENTRO da
	// transacao, depois da autoridade, e colapsa no mesmo codigo opaco de
	// "sucessor invalido".
	return deps.unitOfWork.runInTransaction(
		buildAgencyTenantContext(command.agencyId, input.actorPrincipalId),
		async (context) => {
			const raced = await loadIdempotentCommandResult(
				context.commandJournal,
				command.commandId,
				intent,
			);
			if (raced) {
				return raced;
			}
			const agency = await context.agencyRepository.findByAgencyId(
				command.agencyId,
			);
			if (!agency) {
				throwOrganizationError(
					"ORG_AGENCY_NOT_FOUND",
					`Agency ${command.agencyId} not found`,
				);
			}
			const actorMembership =
				await context.membershipRepository.findByAgencyAndPrincipal(
					command.agencyId,
					input.actorPrincipalId,
				);
			if (
				!actorMembership ||
				actorMembership.status !== "active" ||
				actorMembership.role !== "owner" ||
				agency.ownerPrincipalId !== input.actorPrincipalId
			) {
				throwOrganizationError(
					"ORG_CROSS_TENANT",
					`Principal ${input.actorPrincipalId} is not the active owner of agency ${command.agencyId}`,
				);
			}
			if (command.newOwnerPrincipalId === agency.ownerPrincipalId) {
				const unchanged = commandResultSchema.parse({
					aggregateId: agency.id,
					revision: agency.revision,
				});
				await recordOrganizationCommand(context, {
					commandId: command.commandId,
					commandName: "TransferOwnership",
					aggregateId: agency.id,
					aggregateType: "Agency",
					revision: agency.revision,
					responseSnapshot: toCommandResultSnapshot(unchanged),
					requestHash: intent.requestHash,
				});
				return unchanged;
			}
			const successorMembership =
				await context.membershipRepository.findByAgencyAndPrincipal(
					command.agencyId,
					command.newOwnerPrincipalId,
				);
			// Unico gate do sucessor: membership ATIVA na agency. E' mais forte que
			// consultar existencia global de principal (membership ativa pressupoe
			// principal vinculado) e nao distingue "principal nao existe" de "sem
			// membership ativa" — os dois casos caem no MESMO codigo, entao nao ha'
			// oraculo de existencia cross-tenant (G5-F1/G4-F1).
			if (!successorMembership || successorMembership.status !== "active") {
				throwOrganizationError(
					"ORG_OWNER_REQUIRED",
					"Cannot transfer ownership without an active successor membership",
				);
			}
			const now = new Date();
			const agencyRevision = agency.revision + 1;
			const updatedAgency = await saveWithRevisionConflictMapping(() =>
				context.agencyRepository.save({
					...agency,
					ownerPrincipalId: command.newOwnerPrincipalId,
					revision: agencyRevision,
					updatedAt: now,
				}),
			);
			await saveWithRevisionConflictMapping(() =>
				context.membershipRepository.save({
					...actorMembership,
					role: "admin",
					revision: actorMembership.revision + 1,
					updatedAt: now,
				}),
			);
			await saveWithRevisionConflictMapping(() =>
				context.membershipRepository.save({
					...successorMembership,
					role: "owner",
					revision: successorMembership.revision + 1,
					updatedAt: now,
				}),
			);
			const existingOwner = await context.ownerRepository.findByPrincipalId(
				command.newOwnerPrincipalId,
			);
			if (!existingOwner) {
				await context.ownerRepository.save({
					id: randomUUID(),
					principalId: command.newOwnerPrincipalId,
					defaultOrganizationId: updatedAgency.id,
					createdAt: now,
				});
			}
			const result = commandResultSchema.parse({
				aggregateId: updatedAgency.id,
				revision: updatedAgency.revision,
			});
			const event = createOwnershipTransferredEvent({
				agencyId: updatedAgency.id,
				previousOwnerPrincipalId: input.actorPrincipalId,
				previousOwnerMembershipId: actorMembership.id,
				newOwnerPrincipalId: command.newOwnerPrincipalId,
				newOwnerMembershipId: successorMembership.id,
				revision: updatedAgency.revision,
			});
			await recordOrganizationCommand(context, {
				commandId: command.commandId,
				commandName: "TransferOwnership",
				aggregateId: updatedAgency.id,
				aggregateType: "Agency",
				revision: updatedAgency.revision,
				responseSnapshot: toCommandResultSnapshot(result),
				requestHash: intent.requestHash,
			});
			await context.publishEvents([event]);
			return result;
		},
	);
}

export interface TransferOwnershipInput extends TransferOwnershipCommand {
	actorPrincipalId: string;
}

export interface TransferOwnershipDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
}
