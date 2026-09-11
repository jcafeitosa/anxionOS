import { randomUUID } from "node:crypto";
import type {
	DecisionsCommandResult,
	RecordEvidenceManifestCommand,
} from "@anxionos/contracts/decisions";
import {
	decisionsCommandResultSchema,
	recordEvidenceManifestCommandSchema,
} from "@anxionos/contracts/decisions";
import { createEvidenceManifestRecordedEvent } from "../../domain/events/decisions-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { DecisionsUnitOfWork } from "../../domain/ports/decisions-unit-of-work";
import type { EvidenceManifestEntryRecord } from "../../domain/ports/evidence-manifest";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwDecisionsError } from "../errors";
import { computeEvidenceManifestHash } from "../evidence-manifest-support";

export interface RecordEvidenceManifestDeps {
	unitOfWork: DecisionsUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordEvidenceManifest(
	deps: RecordEvidenceManifestDeps,
	input: RecordEvidenceManifestCommand,
): Promise<DecisionsCommandResult> {
	const command = recordEvidenceManifestCommandSchema.parse(input);
	const replay = await loadIdempotentCommandResultWithGuard(
		deps.commandJournal,
		command.commandId,
		command.organizationId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			return replayIdempotentCommandJournalEntry(raced, command.organizationId);
		}
		if (command.knowledgeEventId) {
			const replayedEntry =
				await ctx.evidenceManifests.findEntryByKnowledgeEventId(
					command.knowledgeEventId,
				);
			if (replayedEntry) {
				const manifest = await ctx.evidenceManifests.findByDecisionId(
					replayedEntry.decisionId,
				);
				return decisionsCommandResultSchema.parse({
					aggregateId: replayedEntry.decisionId,
					revision: 0,
					decisionId: replayedEntry.decisionId,
					evidenceManifestId: manifest?.manifestId,
					idempotentReplay: true,
				});
			}
		}
		const decision = await ctx.decisions.findById(command.decisionId);
		if (!decision || decision.organizationId !== command.organizationId) {
			throwDecisionsError("DC_DECISION_NOT_FOUND", "decision not found");
		}
		if (decision.status === "SUBMITTED") {
			throwDecisionsError(
				"DC_EVIDENCE_INVALID",
				"evidence manifest immutable after submit",
			);
		}
		const manifestId =
			(await ctx.evidenceManifests.findByDecisionId(decision.id))?.manifestId ??
			`dc_emf_${randomUUID()}`;
		for (const entry of command.entries) {
			await ctx.evidenceManifests.appendEntry({
				id: `dc_emn_${randomUUID()}`,
				decisionId: decision.id,
				organizationId: command.organizationId,
				evidenceId: entry.evidenceId,
				claimTextHash: entry.claimTextHash,
				provenanceKind: entry.provenanceKind,
				knowledgeEventId: command.knowledgeEventId,
			});
		}
		const allEntries = await ctx.evidenceManifests.findEntriesByDecisionId(
			decision.id,
		);
		const manifestHash = computeEvidenceManifestHash(
			allEntries.map((entry: EvidenceManifestEntryRecord) => ({
				evidenceId: entry.evidenceId,
				claimTextHash: entry.claimTextHash,
			})),
		);
		const manifest = await ctx.evidenceManifests.upsertManifest({
			decisionId: decision.id,
			organizationId: command.organizationId,
			manifestId,
			manifestHash,
			entryCount: allEntries.length,
		});
		await ctx.publishEvents([
			createEvidenceManifestRecordedEvent({
				decisionId: decision.id,
				organizationId: command.organizationId,
				evidenceManifestId: manifest.manifestId,
				manifestHash: manifest.manifestHash,
				entryCount: manifest.entryCount,
			}),
		]);
		const result = decisionsCommandResultSchema.parse({
			aggregateId: decision.id,
			revision: decision.revision,
			decisionId: decision.id,
			evidenceManifestId: manifest.manifestId,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordEvidenceManifest",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
