import type { GovernanceCommandResult } from "@anxionos/contracts/governance";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import { parseCommandResultSnapshot, throwGovernanceError } from "./errors";

/**
 * Intencao por tras da `Idempotency-Key`. Uma chave so' pode ser **repetida**
 * para o MESMO comando contra o MESMO recurso; reuso divergente e' conflito, nao
 * replay (ANX-457/F1 do G5: antes o reuso devolvia 200 `idempotentReplay` **sem
 * aplicar** a operacao — mesma classe do achado A1/A2 do identity).
 */
export interface GovernanceCommandIntent {
	commandName: string;
	/** Id esperado do agregado, quando o comando o conhece. */
	aggregateId?: string;
	/** Validacao alternativa (comandos que CRIAM o agregado). */
	matchesAggregate?: (aggregateId: string) => Promise<boolean>;
}

async function assertIntentMatches(
	existing: { commandName: string; aggregateId: string },
	intent: GovernanceCommandIntent,
	commandId: string,
): Promise<void> {
	if (existing.commandName !== intent.commandName) {
		throwGovernanceError(
			"GOV_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already used by ${existing.commandName}`,
		);
	}
	if (
		intent.aggregateId !== undefined &&
		existing.aggregateId !== intent.aggregateId
	) {
		throwGovernanceError(
			"GOV_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${commandId} was already applied to another resource`,
		);
	}
	if (intent.matchesAggregate) {
		const matches = await intent.matchesAggregate(existing.aggregateId);
		if (!matches) {
			throwGovernanceError(
				"GOV_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${commandId} was already applied to another resource`,
			);
		}
	}
}

export async function loadIdempotentCommandResult(
	commandJournal: CommandJournalRepository,
	commandId: string,
	intent?: GovernanceCommandIntent,
): Promise<GovernanceCommandResult | null> {
	const existing = await commandJournal.findByCommandId(commandId);
	if (!existing) {
		return null;
	}
	if (intent) {
		await assertIntentMatches(existing, intent, commandId);
	}
	return parseCommandResultSnapshot(existing.responseSnapshot);
}

export function toCommandResultSnapshot(
	result: GovernanceCommandResult,
): Record<string, unknown> {
	return {
		aggregateId: result.aggregateId,
		revision: result.revision,
		authorityEpoch: result.authorityEpoch,
	};
}
