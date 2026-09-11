import { randomUUID } from "node:crypto";
import {
	mapFillConfirmedToApplyFill,
	type PortfoliosExecutionFillConfirmedV1,
} from "@anxionos/contracts/portfolios";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PortfoliosUnitOfWork } from "../../domain/ports/portfolios-unit-of-work";
import { applyFillToPosition } from "../commands/apply-fill-to-position";

export interface FillConfirmedConsumerDeps {
	unitOfWork: PortfoliosUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createFillConfirmedConsumer(deps: FillConfirmedConsumerDeps) {
	return {
		async handle(fill: PortfoliosExecutionFillConfirmedV1) {
			const command = mapFillConfirmedToApplyFill(fill, randomUUID());
			return applyFillToPosition(
				{ unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
				command,
			);
		},
	};
}
