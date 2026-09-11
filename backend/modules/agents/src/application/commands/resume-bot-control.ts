import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	type ComputerSessionCommandResult,
	computerSessionBotResumedPayloadSchema,
	computerSessionCommandResultSchema,
	OPENBOT_EVENT_TYPES,
	type ResumeBotControlCommand,
	resumeBotControlCommandSchema,
} from "@anxionos/contracts/openbot";
import type { ComputerSessionPort } from "../../domain/ports/computer-session-port";

export interface ResumeBotControlDeps {
	computerSession: ComputerSessionPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function resumeBotControl(
	deps: ResumeBotControlDeps,
	input: ResumeBotControlCommand,
): Promise<ComputerSessionCommandResult> {
	const command = resumeBotControlCommandSchema.parse(input);
	const outcome = await deps.computerSession.resumeBotControl({
		sessionId: command.sessionId,
		organizationId: command.organizationId,
	});

	const payload = computerSessionBotResumedPayloadSchema.parse({
		commandId: command.commandId,
		session: outcome.session,
		revokedAuthorityToken: outcome.revokedAuthorityToken,
	});

	if (deps.publishEvents) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.COMPUTER_SESSION_BOT_RESUMED,
				occurredAt: new Date().toISOString(),
				payload,
			}),
		]);
	}

	return computerSessionCommandResultSchema.parse({
		commandId: command.commandId,
		session: outcome.session,
	});
}
