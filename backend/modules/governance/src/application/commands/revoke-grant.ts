import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	governanceCommandResultSchema,
	type RevokeGrantCommand,
	revokeGrantCommandSchema,
} from "@anxionos/contracts/governance";
import { type Grant, isGrantRevoked } from "../../domain/entities/grant";
import {
	createAuthorityEpochBumpedEvent,
	createGrantRevokedEvent,
} from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { GrantRepository } from "../../domain/ports/grant-repository";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

export interface RevokeGrantDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	grantRepository: GrantRepository;
}

export async function revokeGrant(
	deps: RevokeGrantDeps,
	input: RevokeGrantCommand,
): Promise<GovernanceCommandResult> {
	const command = revokeGrantCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
		{ commandName: "RevokeGrant", aggregateId: command.grantId },
	);
	if (replay) {
		return replay;
	}
	// Fetch grant outside transaction to derive TenantContext (Pattern B híbrido)
	const grant = await deps.grantRepository.findById(command.grantId);
	if (!grant) {
		throwGovernanceError(
			"GOV_GRANT_NOT_FOUND",
			`Grant ${command.grantId} not found`,
		);
	}
	const tenantContext: TenantContext = {
		tenantId: grant.tenantId,
		agencyId: grant.agencyId,
		principalId: grant.granteePrincipalId,
	};
	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// ANX-476/FURO 2 (MEDIUM do G5 r2): o antigo `raced` devolvia o snapshot
		// SEM validar intencao. Como o check externo roda antes de 2 roundtrips +
		// pool.connect + BEGIN, um comando concorrente com a MESMA key commitava
		// na janela e o DELETE respondia 200 `idempotentReplay` com o agregado do
		// outro comando, sem revogar. Agora a resolucao valida a intencao
		// (`commandName`/`aggregateId`), como no `issueGrant`.
		const raced = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{ commandName: "RevokeGrant", aggregateId: command.grantId },
		);
		if (raced) {
			return raced;
		}
		const recordAlreadyRevoked = async (current: Grant) => {
			const currentEpoch = await context.authorityEpochStore.get(
				current.scopeId,
			);
			const unchanged = governanceCommandResultSchema.parse({
				aggregateId: current.id,
				revision: current.revision,
				authorityEpoch: currentEpoch.epoch,
			});
			await recordGovernanceCommand(context, {
				commandId: command.commandId,
				commandName: "RevokeGrant",
				aggregateId: current.id,
				aggregateType: "Grant",
				revision: current.revision,
				responseSnapshot: toCommandResultSnapshot(unchanged),
			});
			return unchanged;
		};
		const grant = await context.grantRepository.findById(command.grantId);
		if (!grant) {
			throwGovernanceError(
				"GOV_GRANT_NOT_FOUND",
				`Grant ${command.grantId} not found`,
			);
		}
		if (isGrantRevoked(grant)) {
			return await recordAlreadyRevoked(grant);
		}
		const bumpedEpoch = await context.authorityEpochStore.increment(
			grant.scopeId,
			grant.tenantId,
			grant.agencyId,
		);
		// ANX-476 — o bump de epoch serializa o escopo, mas a leitura do grant
		// aconteceu ANTES dele. Sem a re-leitura, o perdedor de duas revogacoes
		// concorrentes salvava o estado obsoleto (revision ja' bumpada pelo
		// vencedor) e subia 500 `Grant revision conflict` em vez de 409. Com a
		// re-leitura ele cai no no-op e o `recordGovernanceCommand` devolve o
		// conflito institucional, derrubando a transacao.
		const fresh = await context.grantRepository.findById(command.grantId);
		if (!fresh) {
			throwGovernanceError(
				"GOV_GRANT_NOT_FOUND",
				`Grant ${command.grantId} not found`,
			);
		}
		if (isGrantRevoked(fresh)) {
			return await recordAlreadyRevoked(fresh);
		}
		const now = new Date();
		const revision = fresh.revision + 1;
		const updated = await context.grantRepository.save({
			...fresh,
			status: "revoked",
			revision,
			updatedAt: now,
		});
		const result = governanceCommandResultSchema.parse({
			aggregateId: updated.id,
			revision: updated.revision,
			authorityEpoch: bumpedEpoch.epoch,
		});
		const events = [
			createGrantRevokedEvent(
				{
					grantId: updated.id,
					scopeId: updated.scopeId,
					authorityEpoch: bumpedEpoch.epoch,
					revision: updated.revision,
					revokedAt: now.toISOString(),
				},
				now,
			),
			createAuthorityEpochBumpedEvent({
				scopeId: grant.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: "RevokeGrant",
			}),
		];
		await recordGovernanceCommand(context, {
			commandId: command.commandId,
			commandName: "RevokeGrant",
			aggregateId: updated.id,
			aggregateType: "Grant",
			revision: updated.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
