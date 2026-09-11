import { randomUUID } from "node:crypto";
import {
	mapPositionUpdatedToPerformanceInput,
	type PerformanceCommandResult,
	type PortfoliosPositionUpdatedBridge,
} from "@anxionos/contracts/performance";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PerformanceUnitOfWork } from "../../domain/ports/performance-unit-of-work";
import { recordPositionExposureSnapshot } from "../commands/record-position-exposure-snapshot";

export interface PositionUpdatedConsumerDeps {
	unitOfWork: PerformanceUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createPositionUpdatedConsumer(
	deps: PositionUpdatedConsumerDeps,
): {
	handle(
		position: PortfoliosPositionUpdatedBridge,
	): Promise<PerformanceCommandResult>;
} {
	return {
		async handle(position: PortfoliosPositionUpdatedBridge) {
			const command = mapPositionUpdatedToPerformanceInput(
				position,
				randomUUID(),
			);
			return recordPositionExposureSnapshot(
				{ unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
				command,
			);
		},
	};
}
