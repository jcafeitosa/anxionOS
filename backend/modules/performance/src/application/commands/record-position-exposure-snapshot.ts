import { randomUUID } from "node:crypto";
import type {
	PerformanceCommandResult,
	RecordPositionExposureSnapshotCommand,
} from "@anxionos/contracts/performance";
import {
	performanceCommandResultSchema,
	recordPositionExposureSnapshotCommandSchema,
} from "@anxionos/contracts/performance";
import {
	createMetricSnapshotEvent,
	createPositionExposureRecordedEvent,
} from "../../domain/events/performance-events";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PerformanceUnitOfWork } from "../../domain/ports/performance-unit-of-work";
import {
	loadIdempotentByPositionRevision,
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPerformanceError } from "../errors";
import { derivePositionExposureMetrics } from "../exposure-from-position";

async function persistDerivedPositionMetrics(
	ctx: Parameters<Parameters<PerformanceUnitOfWork["runInTransaction"]>[0]>[0],
	input: {
		organizationId: string;
		positionExposureSnapshotId: string;
		command: RecordPositionExposureSnapshotCommand;
		observedAt: string;
	},
): Promise<void> {
	const derived = derivePositionExposureMetrics(input.command);
	const events = [];
	for (const metric of derived) {
		const existing = await ctx.metricSeries.findByPositionExposureAndMetric(
			input.positionExposureSnapshotId,
			metric.metricName,
		);
		if (existing) continue;
		const metricSeriesId = `perf_mtr_${randomUUID()}`;
		const savedMetric = await ctx.metricSeries.save({
			id: metricSeriesId,
			organizationId: input.organizationId,
			positionExposureSnapshotId: input.positionExposureSnapshotId,
			metricName: metric.metricName,
			metricValue: metric.metricValue,
			observedAt: input.observedAt,
		});
		await ctx.metricTimeseries.mirrorMetricSeries(savedMetric, {
			portfolioId: input.command.portfolioId,
			positionId: input.command.positionId,
		});
		events.push(
			createMetricSnapshotEvent({
				metricSeriesId,
				organizationId: input.organizationId,
				positionExposureSnapshotId: input.positionExposureSnapshotId,
				metricName: metric.metricName,
				metricValue: metric.metricValue,
				observedAt: input.observedAt,
			}),
		);
	}
	if (events.length > 0) {
		await ctx.publishEvents(events);
	}
}

export interface RecordPositionExposureSnapshotDeps {
	unitOfWork: PerformanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function recordPositionExposureSnapshot(
	deps: RecordPositionExposureSnapshotDeps,
	input: RecordPositionExposureSnapshotCommand,
): Promise<PerformanceCommandResult> {
	const command = recordPositionExposureSnapshotCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwPerformanceError(
			"PERF_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replayByCommand = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replayByCommand) return replayByCommand;

	const existingByRevision = await deps.commandJournal.findByPositionRevision(
		command.positionId,
		command.revision,
	);
	if (
		existingByRevision &&
		existingByRevision.organizationId !== command.organizationId
	) {
		throwPerformanceError(
			"PERF_CROSS_TENANT",
			"position revision organization mismatch",
		);
	}
	const replayByRevision = await loadIdempotentByPositionRevision(
		deps.commandJournal,
		command.positionId,
		command.revision,
	);
	if (replayByRevision) return replayByRevision;

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const racedByCommand = await ctx.commandJournal.findByCommandId(
			command.commandId,
		);
		if (racedByCommand) {
			if (racedByCommand.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"command journal organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByCommand.responseSnapshot,
			);
			return performanceCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const latest = await ctx.positionExposureSnapshots.findLatestRevision(
			command.positionId,
		);
		if (latest) {
			if (latest.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"position organization mismatch",
				);
			}
			if (command.revision < latest.revision) {
				throwPerformanceError(
					"PERF_STALE_POSITION",
					`stale position revision ${command.revision} < ${latest.revision}`,
				);
			}
		}

		const racedByRevision = await ctx.commandJournal.findByPositionRevision(
			command.positionId,
			command.revision,
		);
		if (racedByRevision) {
			if (racedByRevision.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"position revision organization mismatch",
				);
			}
			const parsed = parseCommandResultSnapshot(
				racedByRevision.responseSnapshot,
			);
			return performanceCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}

		const existingSnapshot =
			await ctx.positionExposureSnapshots.findByPositionRevision(
				command.positionId,
				command.revision,
			);
		if (existingSnapshot) {
			if (existingSnapshot.organizationId !== command.organizationId) {
				throwPerformanceError(
					"PERF_CROSS_TENANT",
					"position exposure snapshot organization mismatch",
				);
			}
			const observedAt = existingSnapshot.observedAt;
			await persistDerivedPositionMetrics(ctx, {
				organizationId: command.organizationId,
				positionExposureSnapshotId: existingSnapshot.id,
				command,
				observedAt,
			});
			const result = performanceCommandResultSchema.parse({
				aggregateId: existingSnapshot.id,
				revision: command.revision,
				positionExposureSnapshotId: existingSnapshot.id,
				idempotentReplay: true,
			});
			await ctx.commandJournal.save({
				commandId: command.commandId,
				organizationId: command.organizationId,
				commandName: "recordPositionExposureSnapshot",
				positionId: command.positionId,
				positionRevision: command.revision,
				responseSnapshot: toCommandResultSnapshot(result),
			});
			return result;
		}

		const snapshotId = `perf_pes_${randomUUID()}`;
		const observedAt = new Date().toISOString();
		const saved = await ctx.positionExposureSnapshots.save({
			id: snapshotId,
			organizationId: command.organizationId,
			portfolioId: command.portfolioId,
			positionId: command.positionId,
			revision: command.revision,
			instrumentId: command.instrumentId,
			positionSide: command.positionSide,
			book: command.book,
			quantity: command.quantity,
			fillId: command.fillId,
			side: command.side,
			provisionalCash: command.provisionalCash ?? false,
			observedAt,
		});
		await ctx.publishEvents([
			createPositionExposureRecordedEvent({
				positionExposureSnapshotId: saved.id,
				organizationId: saved.organizationId,
				portfolioId: saved.portfolioId,
				positionId: saved.positionId,
				revision: saved.revision,
				instrumentId: saved.instrumentId,
				positionSide: saved.positionSide,
				book: saved.book,
				quantity: saved.quantity,
				fillId: saved.fillId,
				side: saved.side,
				provisionalCash: saved.provisionalCash,
				observedAt,
			}),
		]);
		await persistDerivedPositionMetrics(ctx, {
			organizationId: saved.organizationId,
			positionExposureSnapshotId: saved.id,
			command,
			observedAt,
		});
		const result = performanceCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: command.revision,
			positionExposureSnapshotId: saved.id,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "recordPositionExposureSnapshot",
			positionId: command.positionId,
			positionRevision: command.revision,
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
