import type { RecordGateDispositionCommand } from "@anxionos/contracts/orchestration";
import { recordGateDispositionCommandSchema } from "@anxionos/contracts/orchestration";
import type { GateBinding } from "../../domain/entities/gate-binding";
import {} from "../../domain/entities/gate-binding";
import { shouldInvalidatePriorPass } from "../../domain/entities/gate-binding";
import { createGateDispositionRecordedEvent } from "../../domain/events/orchestration-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type {
	OrchestrationTransactionContext,
	OrchestrationUnitOfWork,
} from "../../domain/ports/orchestration-unit-of-work";
import type { OrganizationScopePort } from "../../domain/ports/organization-scope";
import type { PrincipalLookup } from "../../domain/ports/principal-lookup";
import {} from "../../domain/ports/principal-lookup";
import { PrincipalLookupUnavailableError } from "../../domain/ports/principal-lookup";
import {
	buildRecordGateDispositionCommandId,
	hashCommandPayload,
	loadIdempotentRecordGateDispositionSnapshot,
	toRecordGateDispositionSnapshot,
} from "../command-support";
import { toGateBindingV1 } from "../dto-mappers";
import {
	GATE_DISPOSITION_QUOTA_PER_ORG_PER_WINDOW,
	GATE_DISPOSITION_QUOTA_WINDOW_MS,
} from "../../domain/constants";
import { throwOrchestrationError } from "../errors";
import type { HierarchyModeResolverDeps } from "../services/hierarchy-mode-resolver";
import {} from "../services/hierarchy-mode-resolver";
import { resolveHierarchyModeForGate } from "../services/hierarchy-mode-resolver";

export interface RecordGateDispositionResult {
	binding: GateBinding;
	invalidatedPriorCount: number;
	idempotentReplay: boolean;
}
export interface RecordGateDispositionDeps extends HierarchyModeResolverDeps {
	unitOfWork: OrchestrationUnitOfWork;
	commandJournal: CommandJournalRepository;
	organizationScope: OrganizationScopePort;
	principalLookup: PrincipalLookup;
}

async function loadBindingForReplay(
	context: OrchestrationTransactionContext,
	organizationId: string,
	issueIdentifier: string,
	bindingId: string,
) {
	const bindings = await context.gateBindingRepository.listByIssue(
		organizationId,
		issueIdentifier,
	);
	return bindings.find((row: GateBinding) => row.id === bindingId) ?? null;
}
async function assertG7OwnerReviewer(
	principalLookup: PrincipalLookup,
	reviewerId: string,
	organizationId: string,
) {
	try {
		const exists = await principalLookup.exists(reviewerId);
		if (!exists) {
			throwOrchestrationError(
				"ORC_GATE_REVIEWER_MISMATCH",
				`Reviewer ${reviewerId} not found for G7 disposition`,
			);
		}
		const isOwner = await principalLookup.isOwnerPrincipal(
			reviewerId,
			organizationId,
		);
		if (!isOwner) {
			throwOrchestrationError(
				"ORC_GATE_REVIEWER_MISMATCH",
				"G7 disposition requires Owner reviewer",
			);
		}
	} catch (error) {
		if (error instanceof PrincipalLookupUnavailableError) {
			throwOrchestrationError(
				"ORC_IDENTITY_UNAVAILABLE",
				"Identity service unavailable for G7 disposition",
				{ cause: error },
			);
		}
		throw error;
	}
}
export async function recordGateDisposition(
	deps: RecordGateDispositionDeps,
	input: RecordGateDispositionCommand,
): Promise<RecordGateDispositionResult> {
	const command = recordGateDispositionCommandSchema.parse(input);
	const requestHash = hashCommandPayload(command);
	const commandId = buildRecordGateDispositionCommandId(
		command.issueIdentifier,
		command.gateId,
		command.artifactDigest,
		command.disposition,
	);
	const replay = await loadIdempotentRecordGateDispositionSnapshot(
		deps.commandJournal,
		commandId,
		requestHash,
	);
	if (replay) {
		return deps.unitOfWork.runInTransaction(
			async (context: OrchestrationTransactionContext) => {
				const binding = await loadBindingForReplay(
					context,
					command.organizationId,
					command.issueIdentifier,
					replay.bindingId,
				);
				if (!binding) {
					throwOrchestrationError(
						"ORC_IDEMPOTENT_REPLAY",
						`Idempotent replay missing binding for ${command.issueIdentifier}`,
					);
				}
				return {
					binding,
					invalidatedPriorCount: replay.invalidatedPriorCount,
					idempotentReplay: true,
				};
			},
		);
	}
	if (command.gateId === "G7") {
		await assertG7OwnerReviewer(
			deps.principalLookup,
			command.reviewerId,
			command.organizationId,
		);
	}
	const hierarchy = await resolveHierarchyModeForGate(deps, {
		organizationId: command.organizationId,
		agentId: command.reviewerId,
		gateId: command.gateId,
	});
	const recordedAt = new Date();
	return deps.unitOfWork.runInTransaction(
		async (context: OrchestrationTransactionContext) => {
			const raced = await loadIdempotentRecordGateDispositionSnapshot(
				context.commandJournal,
				commandId,
				requestHash,
			);
			if (raced) {
				const binding = await loadBindingForReplay(
					context,
					command.organizationId,
					command.issueIdentifier,
					raced.bindingId,
				);
				if (binding) {
					return {
						binding,
						invalidatedPriorCount: raced.invalidatedPriorCount,
						idempotentReplay: true,
					};
				}
			}
			await deps.organizationScope.assertActive(command.organizationId);
			const quotaSince = new Date(
				recordedAt.getTime() - GATE_DISPOSITION_QUOTA_WINDOW_MS,
			);
			const recentGateRecords =
				await context.gateBindingRepository.countByOrganizationSince(
					command.organizationId,
					quotaSince,
				);
			if (recentGateRecords >= GATE_DISPOSITION_QUOTA_PER_ORG_PER_WINDOW) {
				throwOrchestrationError(
					"ORC_GATE_QUOTA_EXCEEDED",
					`Gate disposition quota ${GATE_DISPOSITION_QUOTA_PER_ORG_PER_WINDOW} exceeded for organization`,
				);
			}
			let invalidatedPriorCount = 0;
			const priorPass = await context.gateBindingRepository.findVigentePass(
				command.organizationId,
				command.issueIdentifier,
				command.gateId,
			);
			if (
				priorPass &&
				shouldInvalidatePriorPass(priorPass, command.artifactDigest ?? null)
			) {
				invalidatedPriorCount =
					await context.gateBindingRepository.invalidatePassBindings(
						command.organizationId,
						command.issueIdentifier,
						command.gateId,
						recordedAt,
					);
			}
			const existingBindings = await context.gateBindingRepository.listByIssue(
				command.organizationId,
				command.issueIdentifier,
			);
			const revision = existingBindings.length + 1;
			const binding = await context.gateBindingRepository.append({
				organizationId: command.organizationId,
				gateId: command.gateId,
				issueIdentifier: command.issueIdentifier,
				runId: command.runId ?? null,
				disposition: command.disposition,
				reviewerId: command.reviewerId,
				artifactDigest: command.artifactDigest ?? null,
				artifactRevision: command.artifactRevision ?? null,
				notApplicableReason: command.notApplicableReason ?? null,
				hierarchyModeAtRecord: hierarchy.hierarchyMode,
				recordedAt,
			});
			const event = createGateDispositionRecordedEvent(
				{
					bindingId: binding.id,
					organizationId: command.organizationId,
					issueIdentifier: command.issueIdentifier,
					gateBinding: toGateBindingV1(binding),
					hierarchyMode: hierarchy.hierarchyMode,
					invalidatedPriorCount,
				},
				recordedAt,
			);
			await context.commandJournal.record({
				commandId,
				commandName: "RecordGateDisposition",
				aggregateId: binding.id,
				aggregateType: "GateBinding",
				revision,
				responseSnapshot: toRecordGateDispositionSnapshot({
					bindingId: binding.id,
					aggregateId: binding.id,
					revision,
					invalidatedPriorCount,
					idempotentReplay: false,
					requestHash,
				}),
			});
			await context.publishEvents([event]);
			return {
				binding,
				invalidatedPriorCount,
				idempotentReplay: false,
			};
		},
	);
}
