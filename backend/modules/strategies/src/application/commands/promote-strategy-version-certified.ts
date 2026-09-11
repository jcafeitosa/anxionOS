import type { StrategiesCommandResult } from "@anxionos/contracts/strategies";
import { strategiesCommandResultSchema } from "@anxionos/contracts/strategies";
import { z } from "zod";
import { createVersionCertifiedEvent } from "../../domain/events/strategies-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	loadIdempotentCommandResultWithGuard,
	replayIdempotentCommandJournalEntry,
	toCommandResultSnapshot,
} from "../command-support";
import { throwStrategiesError } from "../errors";

export const promoteStrategyVersionCertifiedCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	certificationId: z.string().regex(/^evl_crt_[0-9a-f-]{36}$/i),
	strategyId: z.string().regex(/^st_str_[0-9a-f-]{36}$/i),
	strategyVersionId: z.string().regex(/^st_ver_[0-9a-f-]{36}$/i),
	issuedAt: z.string().datetime(),
});

export type PromoteStrategyVersionCertifiedCommand = z.infer<
	typeof promoteStrategyVersionCertifiedCommandSchema
>;

export interface PromoteStrategyVersionCertifiedDeps {
	unitOfWork: StrategiesUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function promoteStrategyVersionCertified(
	deps: PromoteStrategyVersionCertifiedDeps,
	input: PromoteStrategyVersionCertifiedCommand,
): Promise<StrategiesCommandResult> {
	const command = promoteStrategyVersionCertifiedCommandSchema.parse(input);
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
		const strategy = await ctx.strategies.findById(
			command.strategyId,
			command.organizationId,
		);
		if (!strategy) {
			throwStrategiesError(
				"ST_STRATEGY_NOT_FOUND",
				`Strategy ${command.strategyId} not found`,
			);
		}
		const version = await ctx.versions.findById(
			command.strategyVersionId,
			command.organizationId,
		);
		if (!version || version.strategyId !== command.strategyId) {
			throwStrategiesError(
				"ST_VERSION_NOT_FOUND",
				`Strategy version ${command.strategyVersionId} not found`,
			);
		}
		if (version.lifecycleState === "CERTIFIED") {
			const result = strategiesCommandResultSchema.parse({
				aggregateId: version.id,
				revision: version.revision,
				strategyId: version.strategyId,
				strategyVersionId: version.id,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "promoteStrategyVersionCertified",
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}
		if (version.lifecycleState !== "EVALUATED") {
			throwStrategiesError(
				"ST_INVALID_LIFECYCLE_TRANSITION",
				`Certification promotion requires EVALUATED lifecycle, got ${version.lifecycleState}`,
			);
		}
		const promoted = await ctx.versions.update({
			...version,
			lifecycleState: "CERTIFIED",
			revision: version.revision + 1,
		});
		await ctx.publishEvents([
			createVersionCertifiedEvent({
				strategyId: promoted.strategyId,
				strategyVersionId: promoted.id,
				organizationId: promoted.organizationId,
				certificationId: command.certificationId,
				revision: promoted.revision,
				issuedAt: command.issuedAt,
			}),
		]);
		const result = strategiesCommandResultSchema.parse({
			aggregateId: promoted.id,
			revision: promoted.revision,
			strategyId: promoted.strategyId,
			strategyVersionId: promoted.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "promoteStrategyVersionCertified",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
