import type { EvaluationCertificationIssuedBridge } from "@anxionos/contracts/evaluation";
import { mapCertificationIssuedToPromotionInput } from "@anxionos/contracts/evaluation";
import type { StrategiesCommandResult } from "@anxionos/contracts/strategies";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { StrategiesUnitOfWork } from "../../domain/ports/strategies-unit-of-work";
import {
	type PromoteStrategyVersionCertifiedDeps,
	promoteStrategyVersionCertified,
} from "../commands/promote-strategy-version-certified";

/**
 * In-process consumer port for evaluation.certification.issued.v1.
 * Production wiring lives in strategies workers; evaluation module emits the event.
 */
export interface CertificationIssuedConsumerDeps
	extends PromoteStrategyVersionCertifiedDeps {
	commandJournal: CommandJournalRepository;
	unitOfWork: StrategiesUnitOfWork;
}

export function createCertificationIssuedConsumer(
	deps: CertificationIssuedConsumerDeps,
): {
	handle(
		certification: EvaluationCertificationIssuedBridge,
		eventId: string,
	): Promise<StrategiesCommandResult>;
} {
	return {
		async handle(certification, eventId) {
			const input = mapCertificationIssuedToPromotionInput(
				certification,
				eventId,
			);
			return promoteStrategyVersionCertified(deps, input);
		},
	};
}
