import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	type BotRunGenerationCommandResult,
	botRunGenerationCommandResultSchema,
	botRunGenerationReleasedPayloadSchema,
	OPENBOT_EVENT_TYPES,
	type ReleaseBotRunGenerationCommand,
	releaseBotRunGenerationCommandSchema,
} from "@anxionos/contracts/openbot";
import type { BotRunGenerationPort } from "../../domain/ports/bot-run-generation-port";

export interface ReleaseBotRunGenerationDeps {
	botRunGeneration: BotRunGenerationPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function releaseBotRunGeneration(
	deps: ReleaseBotRunGenerationDeps,
	input: ReleaseBotRunGenerationCommand,
): Promise<BotRunGenerationCommandResult> {
	const command = releaseBotRunGenerationCommandSchema.parse(input);
	const outcome = await deps.botRunGeneration.releaseGeneration({
		generationId: command.generationId,
		organizationId: command.organizationId,
	});

	const payload = botRunGenerationReleasedPayloadSchema.parse({
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
				eventType: OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_RELEASED,
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
