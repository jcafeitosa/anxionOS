import { randomUUID } from "node:crypto";
import {
	type GovernanceCommandResult,
	type GovernanceScopeKind,
	governanceCommandResultSchema,
	type IssueGrantCommand,
	isKnownGrantCapability,
	isPlatformOnlyCapability,
	issueGrantCommandSchema,
	PLATFORM_SCOPE_ID,
} from "@anxionos/contracts/governance";
import {
	createAuthorityEpochBumpedEvent,
	createGrantIssuedEvent,
} from "../../domain/events/governance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { GovernanceUnitOfWork } from "../../domain/ports/governance-unit-of-work";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import type { TenantContext } from "../../domain/ports/tenant-context";
import {
	loadIdempotentCommandResult,
	recordGovernanceCommand,
	toCommandResultSnapshot,
} from "../command-support";
import { throwGovernanceError } from "../errors";

export interface IssueGrantInput extends IssueGrantCommand {
	scopeKind?: GovernanceScopeKind;
	/**
	 * ANX-469 — principal que emitiu o grant. Obrigatorio (explicito como `null`
	 * quando derivado pelo sistema) para que a revogacao possa honrar a metade
	 * "ou issuer" do catalogo sem depender de dado que nao existe.
	 */
	issuedByPrincipalId: string | null;
}

export interface IssueGrantDeps {
	unitOfWork: GovernanceUnitOfWork;
	commandJournal: CommandJournalRepository;
	principalLookup: PrincipalLookup;
}

/**
 * ANX-462 — coerencia entre capability e escopo.
 *
 * Sem esta checagem, `POST /v1/agencies/:agencyId/grants` (autorizado para
 * `owner|admin|operator` daquela agencia) aceitava qualquer string em
 * `capability`, incluindo `console.platform`. Como `hasPlatformConsoleGrant`
 * nao filtrava escopo, o operador de agencia abria o console de PLATAFORMA.
 *
 * Regras: escopo PLATFORM exige o identificador canonico; capability
 * platform-only exige escopo PLATFORM.
 */
function assertCapabilityScopeCoherence(
	scopeId: string,
	scopeKind: GovernanceScopeKind,
	capability: string,
): void {
	if (scopeKind === "platform" && scopeId !== PLATFORM_SCOPE_ID) {
		throwGovernanceError(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
			`Platform scope kind requires scopeId ${PLATFORM_SCOPE_ID}`,
		);
	}
	if (scopeKind !== "platform" && scopeId === PLATFORM_SCOPE_ID) {
		throwGovernanceError(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
			"Platform scope id requires scopeKind 'platform'",
		);
	}
	if (scopeKind !== "platform" && isPlatformOnlyCapability(capability)) {
		throwGovernanceError(
			"GOV_CAPABILITY_SCOPE_MISMATCH",
			`Capability ${capability} requires PLATFORM scope`,
		);
	}
}

/**
 * ANX-466 — o grant so' pode carregar um token do catalogo declarado.
 *
 * Sem esta checagem, `capability: z.string().min(1)` aceitava qualquer string e
 * o estado de autorizacao virava texto livre (o ANX-462 fechou apenas a
 * variante `console.platform`). A validacao vive no comando, nao so' na rota,
 * para que seed/worker tambem nao gravem capability desconhecida.
 */
function assertKnownCapability(capability: string): void {
	if (!isKnownGrantCapability(capability)) {
		throwGovernanceError(
			"GOV_CAPABILITY_UNKNOWN",
			`Capability ${capability} is not in the grant capability catalog`,
		);
	}
}

export async function issueGrant(
	deps: IssueGrantDeps,
	input: IssueGrantInput,
): Promise<GovernanceCommandResult> {
	const command = issueGrantCommandSchema.parse(input);
	assertKnownCapability(command.capability);
	const scopeKind: GovernanceScopeKind = input.scopeKind ?? "agency";
	assertCapabilityScopeCoherence(
		command.scopeId,
		scopeKind,
		command.capability,
	);
	const tenantContext: TenantContext = {
		tenantId: command.scopeId,
		agencyId: command.scopeId,
		principalId: command.granteePrincipalId,
	};
	return deps.unitOfWork.runInTransaction(tenantContext, async (context) => {
		// Replay resolvido NA TRANSACAO, com validacao de intencao: o comando CRIA
		// o agregado, entao a intencao e' checada pelo grant que o journal aponta.
		// `matchesAggregate` compara TAMBEM `resourceRef`/`validUntil`/emissor
		// (ANX-476/FURO 3: antes um payload divergente nesses campos devolvia 200
		// sem aplicar). NAO existe lock da key: duas requisicoes concorrentes com a
		// MESMA key serializam no bump de epoch e o perdedor e' derrubado pelo
		// INSERT atomico do journal (`ON CONFLICT DO NOTHING` →
		// `CommandJournalConflictError` → 409 `GOV_DUPLICATE_IDEMPOTENCY`), sem
		// double-apply (ANX-476/FURO 1).
		const journaled = await loadIdempotentCommandResult(
			context.commandJournal,
			command.commandId,
			{
				commandName: "IssueGrant",
				matchesAggregate: async (aggregateId) => {
					const granted = await context.grantRepository.findById(aggregateId);
					if (!granted) {
						return false;
					}
					return (
						granted.granteePrincipalId === command.granteePrincipalId &&
						granted.capability === command.capability &&
						granted.scopeId === command.scopeId &&
						(granted.resourceRef ?? null) === (command.resourceRef ?? null) &&
						(granted.validUntil?.toISOString() ?? null) ===
							(command.validUntil
								? new Date(command.validUntil).toISOString()
								: null) &&
						granted.issuedByPrincipalId === input.issuedByPrincipalId
					);
				},
			},
		);
		if (journaled) {
			return journaled;
		}
		const granteeExists = await deps.principalLookup.exists(
			command.granteePrincipalId,
		);
		if (!granteeExists) {
			throwGovernanceError(
				"GOV_PRINCIPAL_NOT_FOUND",
				`Principal ${command.granteePrincipalId} not found`,
			);
		}
		const bumpedEpoch = await context.authorityEpochStore.increment(
			command.scopeId,
			command.scopeId,
			command.scopeId,
		);
		const now = new Date();
		const grantId = randomUUID();
		const revision = 1;
		const validUntil = command.validUntil ? new Date(command.validUntil) : null;
		const saved = await context.grantRepository.save({
			id: grantId,
			tenantId: command.scopeId,
			agencyId: command.scopeId,
			scopeId: command.scopeId,
			scopeKind,
			granteePrincipalId: command.granteePrincipalId,
			granteeAgentId: null,
			issuedByPrincipalId: input.issuedByPrincipalId,
			capability: command.capability,
			resourceRef: command.resourceRef ?? null,
			status: "active",
			validFrom: now,
			validUntil,
			derivedFromMembershipId: null,
			authorityEpochAtIssue: bumpedEpoch.epoch,
			revision,
			createdAt: now,
			updatedAt: now,
		});
		const result = governanceCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			authorityEpoch: bumpedEpoch.epoch,
		});
		const events = [
			createGrantIssuedEvent(
				{
					grantId: saved.id,
					scopeId: saved.scopeId,
					granteePrincipalId: saved.granteePrincipalId,
					capability: saved.capability,
					status: saved.status,
					authorityEpoch: bumpedEpoch.epoch,
					revision: saved.revision,
					validFrom: saved.validFrom.toISOString(),
					validUntil: saved.validUntil?.toISOString() ?? null,
				},
				now,
			),
			createAuthorityEpochBumpedEvent({
				scopeId: command.scopeId,
				epoch: bumpedEpoch.epoch,
				reason: "IssueGrant",
			}),
		];
		await recordGovernanceCommand(context, {
			commandId: command.commandId,
			commandName: "IssueGrant",
			aggregateId: saved.id,
			aggregateType: "Grant",
			revision: saved.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		await context.publishEvents(events);
		return result;
	});
}
