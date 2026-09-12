import { randomUUID } from "node:crypto";
import {
	type CommandResult,
	type CreateAgencyCommand,
	commandResultSchema,
	createAgencyCommandSchema,
} from "@anxionos/contracts/organizations";
import { createAgencyCreatedEvent } from "../../domain/events/organization-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { OrganizationUnitOfWork } from "../../domain/ports/organization-unit-of-work";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import {
	hashCommandPayload,
	loadIdempotentCommandResult,
	recordOrganizationCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { assertPrincipalExists } from "../services/principal-guard";
import { buildAgencyTenantContext } from "../services/tenant-context";

export async function createAgency(
	deps: CreateAgencyDeps,
	input: CreateAgencyInput,
): Promise<CommandResult> {
	const command = createAgencyCommandSchema.parse(input);
	// O comando CRIA o agregado, entao a intencao e' o payload inteiro: o
	// `requestHash` distingue dois Creates com o mesmo Owner/payload de um reuso
	// divergente da key (409), sem depender de estado que ainda nao existe.
	const intent = {
		commandName: "CreateAgency",
		requestHash: hashCommandPayload({
			ownerPrincipalId: input.ownerPrincipalId,
			displayName: command.displayName,
			marketScope: command.marketScope,
		}),
	};
	// Red Team (Davi): NAO chamar loadIdempotentCommandResult aqui, fora do tenant
	// context. A verificacao de replay deve acontecer DENTRO da transacao, com
	// app.tenant_id definido, para garantir isolamento por tenant.
	await assertPrincipalExists(deps.principalLookup, input.ownerPrincipalId);
	const agencyId = randomUUID();
	const ownerId = randomUUID();
	const membershipId = randomUUID();
	const now = new Date();
	const revision = 1;
	const result = commandResultSchema.parse({
		aggregateId: agencyId,
		revision,
	});
	const event = createAgencyCreatedEvent({
		agencyId,
		ownerPrincipalId: input.ownerPrincipalId,
		displayName: command.displayName,
		marketScope: command.marketScope,
		status: "draft",
		onboardingStep: "created",
		revision,
	});
	return deps.unitOfWork.runInTransaction(
		// QE (Rafael): createAgency CRIA o agencyId (ainda nao existe). Para que o
		// replay funcione, tenantId deve ser ESTAVEL entre execuções da mesma key.
		// O agencyId muda a cada tentativa (randomUUID), mas ownerPrincipalId e'
		// estavel. Usar owner como tenant_id para journal ate' a agency existir.
		// RLS: app.agency_id deve corresponder ao agency_id inserido na tabela.
		buildAgencyTenantContext(input.ownerPrincipalId, agencyId, input.ownerPrincipalId),
		async (context) => {
			// Replay como PRIMEIRA operacao da transacao, com validacao de intencao.
			// As validacoes dependentes de estado vem depois: resolver o retry
			// legitimo antes delas e' o que impede a regressao do G2 (retry apos o
			// agregado mudar de estado precisa continuar sendo replay).
			const raced = await loadIdempotentCommandResult(
				context.commandJournal,
				command.commandId,
				intent,
				input.ownerPrincipalId, // tenant_id = owner (estavel)
			);
			if (raced) {
				return raced;
			}
			await context.agencyRepository.save({
				id: agencyId,
				ownerPrincipalId: input.ownerPrincipalId,
				displayName: command.displayName,
				marketScope: command.marketScope,
				status: "draft",
				onboardingStep: "created",
				revision,
				createdAt: now,
				updatedAt: now,
			});
			const existingOwner = await context.ownerRepository.findByPrincipalId(
				input.ownerPrincipalId,
			);
			if (!existingOwner) {
				await context.ownerRepository.save({
					id: ownerId,
					principalId: input.ownerPrincipalId,
					defaultOrganizationId: agencyId,
					createdAt: now,
				});
			}
			await context.membershipRepository.save({
				id: membershipId,
				agencyId,
				principalId: input.ownerPrincipalId,
				inviteEmail: null,
				inviteTokenHash: null,
				inviteExpiresAt: null,
				role: "owner",
				status: "active",
				invitedAt: null,
				joinedAt: now,
				revokedAt: null,
				revision: 1,
				createdAt: now,
				updatedAt: now,
		});
		await recordOrganizationCommand(
			context,
			{
				commandId: command.commandId,
				commandName: "CreateAgency",
				aggregateId: agencyId,
				aggregateType: "Agency",
				revision,
				responseSnapshot: toCommandResultSnapshot(result),
				requestHash: intent.requestHash,
			},
			input.ownerPrincipalId, // tenant_id = owner (estavel)
		);
		await context.publishEvents([event]);
		return result;
		},
	);
}

export interface CreateAgencyInput extends CreateAgencyCommand {
	ownerPrincipalId: string;
}

export interface CreateAgencyDeps {
	unitOfWork: OrganizationUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}
