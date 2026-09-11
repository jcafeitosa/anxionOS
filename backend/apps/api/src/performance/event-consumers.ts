import { ACCOUNTING_EVENT_TYPES } from "@anxionos/contracts/accounting";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	accountingLedgerPostedBridgeSchema,
	portfoliosPositionUpdatedBridgeSchema,
} from "@anxionos/contracts/performance";
import { PORTFOLIOS_EVENT_TYPES } from "@anxionos/contracts/portfolios";
import {
	type InboxConsumer,
	processWithInbox,
} from "@anxionos/eventing/postgres";
import {
	createLedgerPostedConsumer,
	createPerformanceUnitOfWork,
	createPgCommandJournalRepository,
	createPositionUpdatedConsumer,
	PerformanceCommandError,
} from "@anxionos/performance";
import type { Pool } from "pg";
import { ZodError } from "zod";

export type PerformanceEventConsumerFailureClass = "permanent" | "transient";

export const PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME =
	"apps/api:performance-ledger-posted:v1";
export const PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME =
	"apps/api:performance-position-updated:v1";

export interface PerformanceEventConsumerDeps {
	ledgerPostedConsumer: ReturnType<typeof createLedgerPostedConsumer>;
	positionUpdatedConsumer: ReturnType<typeof createPositionUpdatedConsumer>;
}

export function classifyPerformanceEventConsumerError(
	error: unknown,
): PerformanceEventConsumerFailureClass {
	if (error instanceof PerformanceCommandError) {
		return "permanent";
	}
	if (error instanceof ZodError) {
		return "permanent";
	}
	if (error instanceof SyntaxError || error instanceof TypeError) {
		return "permanent";
	}
	return "transient";
}

export function createPerformanceEventConsumerDeps(
	pool: Pool,
): PerformanceEventConsumerDeps {
	const unitOfWork = createPerformanceUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	return {
		ledgerPostedConsumer: createLedgerPostedConsumer({
			unitOfWork,
			commandJournal,
		}),
		positionUpdatedConsumer: createPositionUpdatedConsumer({
			unitOfWork,
			commandJournal,
		}),
	};
}

function createPerformanceLedgerPostedInboxConsumer(
	deps: PerformanceEventConsumerDeps,
): InboxConsumer {
	return {
		name: PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			if (envelope.eventType !== ACCOUNTING_EVENT_TYPES.LEDGER_POSTED) {
				return;
			}
			const payload = accountingLedgerPostedBridgeSchema.parse(
				envelope.payload,
			);
			await deps.ledgerPostedConsumer.handle(payload);
		},
	};
}

function createPerformancePositionUpdatedInboxConsumer(
	deps: PerformanceEventConsumerDeps,
): InboxConsumer {
	return {
		name: PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			if (envelope.eventType !== PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED) {
				return;
			}
			const payload = portfoliosPositionUpdatedBridgeSchema.parse(
				envelope.payload,
			);
			await deps.positionUpdatedConsumer.handle(payload);
		},
	};
}

export async function processPerformanceLedgerPostedEvent(
	pool: Pool,
	deps: PerformanceEventConsumerDeps,
	rawEnvelope: unknown,
): Promise<"processed" | "skipped"> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (envelope.eventType !== ACCOUNTING_EVENT_TYPES.LEDGER_POSTED) {
		return "skipped";
	}
	return processWithInbox(
		pool,
		createPerformanceLedgerPostedInboxConsumer(deps),
		envelope,
	);
}

export async function processPerformancePositionUpdatedEvent(
	pool: Pool,
	deps: PerformanceEventConsumerDeps,
	rawEnvelope: unknown,
): Promise<"processed" | "skipped"> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (envelope.eventType !== PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED) {
		return "skipped";
	}
	return processWithInbox(
		pool,
		createPerformancePositionUpdatedInboxConsumer(deps),
		envelope,
	);
}
