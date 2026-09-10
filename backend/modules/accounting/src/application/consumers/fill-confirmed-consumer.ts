import { randomUUID } from "node:crypto";
import {
	type AccountingCommandResult,
	type ExecutionFillConfirmedV1,
	mapFillConfirmedToPostTradeFill,
} from "@anxionos/contracts/accounting";
import type { AccountingUnitOfWork } from "../../domain/ports/accounting-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import { postTradeFill } from "../commands/post-trade-fill";

export interface FillConfirmedConsumerDeps {
	unitOfWork: AccountingUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export function createFillConfirmedConsumer(deps: FillConfirmedConsumerDeps): {
	handle(fill: ExecutionFillConfirmedV1): Promise<AccountingCommandResult>;
} {
	return {
		async handle(fill: ExecutionFillConfirmedV1) {
			const command = mapFillConfirmedToPostTradeFill(fill, randomUUID());
			return postTradeFill(
				{ unitOfWork: deps.unitOfWork, commandJournal: deps.commandJournal },
				command,
			);
		},
	};
}
