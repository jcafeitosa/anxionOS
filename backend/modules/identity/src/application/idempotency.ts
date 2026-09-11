import type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "../domain/ports/command-journal";
import type { IdentityTransactionContext } from "../domain/ports/identity-unit-of-work";
import { isUniqueViolation, throwIdentityError } from "./errors";

/**
 * Intent behind an `Idempotency-Key` (materialized as `commandId`). A key may
 * only ever be replayed for the SAME command against the SAME aggregate —
 * otherwise a client that reuses a key across operations would get a 200
 * without the operation being applied (R04: that is
 * `IDN_DUPLICATE_IDEMPOTENCY`, not a silent replay).
 */
export interface CommandIntent {
	commandId: string;
	commandName: string;
	/**
	 * Expected aggregate id. Omitted for commands that CREATE the aggregate
	 * (the id does not exist yet) — in that case pass `matchesAggregate`.
	 */
	aggregateId?: string;
	/**
	 * Validation used instead of `aggregateId` for creating commands: given the
	 * aggregate the journal holds, confirm it represents the same intent.
	 */
	matchesAggregate?: (aggregateId: string) => Promise<boolean>;
}

async function assertIntentMatches(
	journaled: CommandJournalRecord,
	intent: CommandIntent,
): Promise<void> {
	if (journaled.commandName !== intent.commandName) {
		throwIdentityError(
			"IDN_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${intent.commandId} was already used by ${journaled.commandName}`,
		);
	}
	if (
		intent.aggregateId !== undefined &&
		journaled.aggregateId !== intent.aggregateId
	) {
		throwIdentityError(
			"IDN_DUPLICATE_IDEMPOTENCY",
			`Idempotency key ${intent.commandId} was already applied to another aggregate`,
		);
	}
	if (intent.matchesAggregate) {
		const matches = await intent.matchesAggregate(journaled.aggregateId);
		if (!matches) {
			throwIdentityError(
				"IDN_DUPLICATE_IDEMPOTENCY",
				`Idempotency key ${intent.commandId} was already applied to another resource`,
			);
		}
	}
}

/** Reads the journal entry for an intent, rejecting divergent reuse. */
export async function findIdempotentCommand(
	journal: CommandJournalRepository,
	intent: CommandIntent,
): Promise<CommandJournalRecord | null> {
	const journaled = await journal.findByCommandId(intent.commandId);
	if (!journaled) {
		return null;
	}
	await assertIntentMatches(journaled, intent);
	return journaled;
}

/**
 * Records the command in the journal inside the transaction.
 *
 * - a matching entry already present means a concurrent execution of the same
 *   command won: nothing to record (the caller returns the replayed state);
 * - a divergent entry means key reuse across operations: rejected;
 * - a primary-key collision (23505) means two executions raced to record:
 *   mapped to `IDN_DUPLICATE_IDEMPOTENCY`, never surfaced as an internal error.
 */
export async function recordIdempotentCommand(
	context: IdentityTransactionContext,
	entry: NewCommandJournalRecord,
): Promise<"recorded" | "already-recorded"> {
	const existing = await context.commandJournal.findByCommandId(
		entry.commandId,
	);
	if (existing) {
		await assertIntentMatches(existing, {
			commandId: entry.commandId,
			commandName: entry.commandName,
			aggregateId: entry.aggregateId,
		});
		return "already-recorded";
	}
	try {
		await context.commandJournal.record(entry);
		return "recorded";
	} catch (error) {
		if (isUniqueViolation(error)) {
			throwIdentityError(
				"IDN_DUPLICATE_IDEMPOTENCY",
				`Command ${entry.commandId} is already being processed`,
			);
		}
		throw error;
	}
}
