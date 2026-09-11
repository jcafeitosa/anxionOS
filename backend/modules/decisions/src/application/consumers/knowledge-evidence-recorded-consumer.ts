import type { DecisionsCommandResult } from "@anxionos/contracts/decisions";
import type { KnowledgeEvidenceRecordedBridge } from "@anxionos/contracts/knowledge";
import { mapEvidenceRecordedToAttachInput } from "@anxionos/contracts/knowledge";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import {
	type RecordEvidenceManifestDeps,
	recordEvidenceManifest,
} from "../commands/record-evidence-manifest";
import { throwDecisionsError } from "../errors";

export interface KnowledgeEvidenceRecordedConsumerDeps
	extends RecordEvidenceManifestDeps {
	commandJournal: CommandJournalRepository;
	unitOfWork: DecisionsUnitOfWork;
}

export function createKnowledgeEvidenceRecordedConsumer(
	deps: KnowledgeEvidenceRecordedConsumerDeps,
): {
	handle(
		evidence: KnowledgeEvidenceRecordedBridge,
		eventId: string,
	): Promise<
		| DecisionsCommandResult
		| { decisionId: string | null; ignored: true; idempotentReplay?: boolean }
	>;
} {
	return {
		async handle(evidence, eventId) {
			const attachInput = mapEvidenceRecordedToAttachInput(evidence, eventId);
			if (!attachInput) {
				return { decisionId: null, ignored: true };
			}
			const replayed = await deps.unitOfWork.runInTransaction(async (ctx) =>
				ctx.evidenceManifests.findEntryByKnowledgeEventId(eventId),
			);
			if (replayed) {
				return {
					decisionId: replayed.decisionId,
					ignored: true,
					idempotentReplay: true,
				};
			}
			const decision = await deps.unitOfWork.runInTransaction(async (ctx) =>
				ctx.decisions.findById(attachInput.decisionId),
			);
			if (!decision) {
				return { decisionId: null, ignored: true };
			}
			if (decision.organizationId !== attachInput.organizationId) {
				throwDecisionsError(
					"DC_CROSS_TENANT",
					"knowledge event organization mismatch",
				);
			}
			if (decision.status === "SUBMITTED") {
				return { decisionId: decision.id, ignored: true };
			}
			const priorRevision = decision.revision;
			const result = await recordEvidenceManifest(deps, {
				commandId: attachInput.commandId,
				organizationId: attachInput.organizationId,
				decisionId: attachInput.decisionId,
				entries: [
					{
						evidenceId: attachInput.evidenceId,
						claimTextHash: attachInput.claimTextHash,
						provenanceKind: attachInput.provenanceKind,
					},
				],
				knowledgeEventId: attachInput.knowledgeEventId,
			});
			const after = await deps.unitOfWork.runInTransaction(async (ctx) =>
				ctx.decisions.findById(decision.id),
			);
			if (after && after.revision !== priorRevision) {
				throwDecisionsError(
					"DC_EVIDENCE_INVALID",
					"evidence must not mutate decision authority state",
				);
			}
			return result;
		},
	};
}
