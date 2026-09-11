import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	SIMULATION_EVENT_TYPES,
	strategiesBacktestRequestedBridgeSchema,
} from "@anxionos/contracts/simulation";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import {
	type InboxConsumer,
	processWithInbox,
} from "@anxionos/eventing/postgres";
import {
	SimulationCommandError,
	SimulationContractError,
	createBacktestRequestedConsumer,
	createDefaultSimulationResultStore,
	createDefaultSimulationSandbox,
	createPgCommandJournalRepository,
	createRunStartedConsumer,
	createSimulationUnitOfWork,
} from "@anxionos/simulation";
import type { Pool } from "pg";
import { ZodError } from "zod";

export type SimulationEventConsumerFailureClass = "permanent" | "transient";

export const SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME =
	"apps/api:simulation-backtest-requested:v1";
export const SIMULATION_RUN_STARTED_CONSUMER_NAME =
	"apps/api:simulation-run-started:v1";

export interface SimulationEventConsumerDeps {
	backtestRequestedConsumer: ReturnType<typeof createBacktestRequestedConsumer>;
	runStartedConsumer: ReturnType<typeof createRunStartedConsumer>;
}

export function classifySimulationEventConsumerError(
	error: unknown,
): SimulationEventConsumerFailureClass {
	if (error instanceof SimulationCommandError) {
		return "permanent";
	}
	if (error instanceof SimulationContractError) {
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

export function createSimulationEventConsumerDeps(
	pool: Pool,
): SimulationEventConsumerDeps {
	const unitOfWork = createSimulationUnitOfWork(pool);
	const commandJournal = createPgCommandJournalRepository(pool);
	const sandbox = createDefaultSimulationSandbox();
	const resultStore = createDefaultSimulationResultStore();
	const executionDeps = {
		unitOfWork,
		commandJournal,
		sandbox,
		resultStore,
	};
	return {
		backtestRequestedConsumer: createBacktestRequestedConsumer(executionDeps),
		runStartedConsumer: createRunStartedConsumer(executionDeps),
	};
}

function createSimulationBacktestRequestedInboxConsumer(
	deps: SimulationEventConsumerDeps,
): InboxConsumer {
	return {
		name: SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			if (envelope.eventType !== STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED) {
				return;
			}
			const payload = strategiesBacktestRequestedBridgeSchema.parse(
				envelope.payload,
			);
			await deps.backtestRequestedConsumer.handle(payload, envelope.eventId);
		},
	};
}

function createSimulationRunStartedInboxConsumer(
	deps: SimulationEventConsumerDeps,
): InboxConsumer {
	return {
		name: SIMULATION_RUN_STARTED_CONSUMER_NAME,
		async handle(envelope: DomainEventEnvelope) {
			if (envelope.eventType !== SIMULATION_EVENT_TYPES.RUN_STARTED) {
				return;
			}
			await deps.runStartedConsumer.handle(envelope.payload, envelope.eventId);
		},
	};
}

export async function processSimulationBacktestRequestedEvent(
	pool: Pool,
	deps: SimulationEventConsumerDeps,
	rawEnvelope: unknown,
): Promise<"processed" | "skipped"> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (envelope.eventType !== STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED) {
		return "skipped";
	}
	return processWithInbox(
		pool,
		createSimulationBacktestRequestedInboxConsumer(deps),
		envelope,
	);
}

export async function processSimulationRunStartedEvent(
	pool: Pool,
	deps: SimulationEventConsumerDeps,
	rawEnvelope: unknown,
): Promise<"processed" | "skipped"> {
	const envelope = domainEventEnvelopeSchema.parse(rawEnvelope);
	if (envelope.eventType !== SIMULATION_EVENT_TYPES.RUN_STARTED) {
		return "skipped";
	}
	return processWithInbox(
		pool,
		createSimulationRunStartedInboxConsumer(deps),
		envelope,
	);
}
