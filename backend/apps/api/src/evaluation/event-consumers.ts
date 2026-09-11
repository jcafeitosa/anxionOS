import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { PERFORMANCE_EVENT_TYPES } from "@anxionos/contracts/performance";
import { performanceOutcomeRecordedBridgeSchema } from "@anxionos/contracts/evaluation";
import {
	type InboxConsumer,
	processWithInbox,
} from "@anxionos/eventing/postgres";
import {
	EvaluationCommandError,
	createOutcomeRecordedConsumer,
	createEvaluationUnitOfWork,
	createPgCommandJournalRepository,
} from "@anxionos/evaluation";
import type { Pool } from "pg";
import { ZodError } from "zod";

export type EvaluationEventConsumerFailureClass = "permanent" | "transient";

export const EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME =
	"apps/api:evaluation-outcome-recorded:v1";

export interface EvaluationEventConsumerDeps {
	outcomeRecordedConsumer: ReturnType<typeof createOutcomeRecordedConsumer>;
}

export function classifyEvaluationEventConsumerError(
	error: unknown,
): EvaluationEventConsumerFailureClass {
	if (error instanceof EvaluationCommandError) {
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

export function createEvaluationEventConsumerDeps(
	pool: Pool,
): EvaluationEventConsumerDeps {
	const unitOfWork = createEvaluationUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	return {
		outcomeRecordedConsumer: createOutcomeRecordedConsumer({
			unitOfWork,
			commandJournal,
		}),
	};
}

function createEvaluationOutcomeRecordedInboxConsumer(
	deps: EvaluationEventConsumerDeps,
): InboxConsumer {
	return {
		name: EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			if (envelope.eventType !== PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED) {
				return;
			}
			const payload = performanceOutcomeRecordedBridgeSchema.parse(
				envelope.payload,
			);
			await deps.outcomeRecordedConsumer.handle(payload);
		},
	};
}

export async function processEvaluationOutcomeRecordedEvent(
	pool: Pool,
	deps: EvaluationEventConsumerDeps,
	rawEnvelope: unknown,
): Promise<"processed" | "skipped"> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (envelope.eventType !== PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED) {
		return "skipped";
	}
	return processWithInbox(
		pool,
		createEvaluationOutcomeRecordedInboxConsumer(deps),
		envelope,
	);
}
