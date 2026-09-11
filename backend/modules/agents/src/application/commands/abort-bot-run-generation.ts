import { randomUUID } from "node:crypto";
import {
	abortBotRunGenerationCommandSchema,
	botRunGenerationCommandResultSchema,
	OPENBOT_EVENT_TYPES,
	botRunGenerationAbortedPayloadSchema,
	type AbortBotRunGenerationCommand,
	type BotRunGenerationCommandResult,
} from "@anxionos/contracts/openbot";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import type { BotRunGenerationPort } from "../../domain/ports/bot-run-generation-port";

export interface AbortBotRunGenerationDeps {
	botRunGeneration: BotRunGenerationPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function abortBotRunGeneration(
	deps: AbortBotRunGenerationDeps,
	input: AbortBotRunGenerationCommand,
): Promise<BotRunGenerationCommandResult> {
	const command = abortBotRunGenerationCommandSchema.parse(input);
	const outcome = await deps.botRunGeneration.abortGeneration({
		generationId: command.generationId,
		organizationId: command.organizationId,
		abortToken: command.abortToken,
		runRevision: command.runRevision,
	});

	const payload = botRunGenerationAbortedPayloadSchema.parse({
		commandId: command.commandId,
		generation: outcome.generation,
		idempotentReplay: outcome.idempotentReplay,
	});

	if (deps.publishEvents && !outcome.idempotentReplay) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ABORTED,
				occurredAt: new Date().toISOString(),
				payload,
			}),
		]);
	}

	return botRunGenerationCommandResultSchema.parse({
		commandId: command.commandId,
		generation: outcome.generation,
		idempotentReplay: outcome.idempotentReplay,
	});
}
