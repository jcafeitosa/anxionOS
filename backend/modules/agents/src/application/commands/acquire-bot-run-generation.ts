import { randomUUID } from "node:crypto";
import {
	acquireBotRunGenerationCommandSchema,
	botRunGenerationCommandResultSchema,
	OPENBOT_EVENT_TYPES,
	botRunGenerationAcquiredPayloadSchema,
	type AcquireBotRunGenerationCommand,
	type BotRunGenerationCommandResult,
} from "@anxionos/contracts/openbot";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import type { BotRunGenerationPort } from "../../domain/ports/bot-run-generation-port";

export interface AcquireBotRunGenerationDeps {
	botRunGeneration: BotRunGenerationPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function acquireBotRunGeneration(
	deps: AcquireBotRunGenerationDeps,
	input: AcquireBotRunGenerationCommand,
): Promise<BotRunGenerationCommandResult> {
	const command = acquireBotRunGenerationCommandSchema.parse(input);
	const generation = await deps.botRunGeneration.acquireGeneration({
		organizationId: command.organizationId,
		agentId: command.agentId,
		runId: command.runId,
		runRevision: command.runRevision,
	});

	const payload = botRunGenerationAcquiredPayloadSchema.parse({
		commandId: command.commandId,
		generation,
	});

	if (deps.publishEvents) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.BOT_RUN_GENERATION_ACQUIRED,
				occurredAt: new Date().toISOString(),
				payload,
			}),
		]);
	}

	return botRunGenerationCommandResultSchema.parse({
		commandId: command.commandId,
		generation,
	});
}
