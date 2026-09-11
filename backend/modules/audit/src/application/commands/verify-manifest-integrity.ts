import type {
	VerifyManifestIntegrityCommand,
	VerifyManifestIntegrityResult,
} from "@anxionos/contracts/audit";
import {
	verifyManifestIntegrityCommandSchema,
	verifyManifestIntegrityResultSchema,
} from "@anxionos/contracts/audit";
import type { AuditUnitOfWork } from "../../domain/ports/audit-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	assertCommandJournalReplay,
	CommandJournalHashMismatchError,
	hashCommandPayload,
	loadIdempotentCommandResultWithGuard,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwAuditError } from "../errors";

export interface VerifyManifestIntegrityDeps {
	unitOfWork: AuditUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function verifyManifestIntegrity(
	deps: VerifyManifestIntegrityDeps,
	input: VerifyManifestIntegrityCommand,
): Promise<VerifyManifestIntegrityResult> {
	const command = verifyManifestIntegrityCommandSchema.parse(input);
	const requestHash = hashCommandPayload({
		organizationId: command.organizationId,
		manifestId: command.manifestId,
		payloadHash: command.payloadHash.toLowerCase(),
	});
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwAuditError(
			"AUD_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	try {
		const replay = await loadIdempotentCommandResultWithGuard(
			deps.commandJournal,
			command.commandId,
			command.organizationId,
			requestHash,
		);
		if (replay) {
			return verifyManifestIntegrityResultSchema.parse({
				aggregateId: replay.aggregateId,
				revision: replay.revision,
				manifestId: command.manifestId,
				integrity: "verified",
				idempotentReplay: true,
			});
		}
	} catch (error) {
		if (error instanceof CommandJournalHashMismatchError) {
			throwAuditError(
				"AUD_TAMPER_DETECTED",
				`Payload hash mismatch for manifest ${command.manifestId}`,
			);
		}
		throw error;
	}
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			if (raced.organizationId !== command.organizationId) {
				throwAuditError(
					"AUD_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			try {
				assertCommandJournalReplay(raced.responseSnapshot, requestHash);
			} catch (error) {
				if (error instanceof CommandJournalHashMismatchError) {
					throwAuditError(
						"AUD_TAMPER_DETECTED",
						`Payload hash mismatch for manifest ${command.manifestId}`,
					);
				}
				throw error;
			}
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return verifyManifestIntegrityResultSchema.parse({
				aggregateId: parsed.aggregateId,
				revision: parsed.revision,
				manifestId: command.manifestId,
				integrity: "verified",
				idempotentReplay: true,
			});
		}
		const manifest = await ctx.manifests.findById(command.manifestId);
		if (!manifest) {
			throwAuditError(
				"AUD_MANIFEST_NOT_FOUND",
				`Manifest ${command.manifestId} not found`,
			);
		}
		if (manifest.organizationId !== command.organizationId) {
			throwAuditError("AUD_CROSS_TENANT", "manifest organization mismatch");
		}
		if (
			manifest.payloadHash.toLowerCase() !== command.payloadHash.toLowerCase()
		) {
			throwAuditError(
				"AUD_TAMPER_DETECTED",
				`Payload hash mismatch for manifest ${command.manifestId}`,
			);
		}
		const result = verifyManifestIntegrityResultSchema.parse({
			aggregateId: manifest.id,
			revision: 1,
			manifestId: manifest.id,
			integrity: "verified",
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "verifyManifestIntegrity",
			responseSnapshot: toCommandResultSnapshot(result, requestHash),
		});
		return result;
	});
}
