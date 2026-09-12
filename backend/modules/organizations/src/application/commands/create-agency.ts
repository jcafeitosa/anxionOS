import { createHash, randomUUID } from "node:crypto";
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

/**
 * Generate a deterministic UUID from a command ID.
 * Same commandId always produces the same agencyId, ensuring idempotent replay
 * works correctly with tenant-scoped journal lookups.
 */
function deterministicAgencyId(commandId: string): string {
	const hash = createHash("sha256").update(commandId).digest("hex");
	// Format as UUID v5-style: xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		`5${hash.slice(13, 16)}`, // version 5
		`${((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, "0")}${hash.slice(18, 20)}`, // variant
		hash.slice(20, 32),
	].join("-");
}

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
	// ANX-480: agencyId must be DETERMINISTIC (derived from commandId) so that
	// retries of the same Idempotency-Key find the same journal row AND satisfy
	// agencies RLS (app.agency_id must match the agency_id being inserted).
	const agencyId = deterministicAgencyId(command.commandId);
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
		// ANX-480: agencyId is deterministic (from commandId), so it's stable across
		// retries. Use agencyId as BOTH tenant_id (for journal isolation) and
		// agency_id (for agencies RLS). This matches main branch pattern and satisfies
		// RLS policy: app.tenant_id = app.agency_id = agencyId = row values.
		buildAgencyTenantContext(agencyId, agencyId, input.ownerPrincipalId),
		async (context) => {
			// Replay como PRIMEIRA operacao da transacao, com validacao de intencao.
			// As validacoes dependentes de estado vem depois: resolver o retry
			// legitimo antes delas e' o que impede a regressao do G2 (retry apos o
			// agregado mudar de estado precisa continuar sendo replay).
			const raced = await loadIdempotentCommandResult(
				context.commandJournal,
				command.commandId,
				intent,
				agencyId, // tenant_id = stable agencyId
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
			agencyId, // tenant_id = stable agencyId
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
