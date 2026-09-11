import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	type ComputerSessionCommandResult,
	computerSessionCommandResultSchema,
	computerSessionReleasedPayloadSchema,
	OPENBOT_EVENT_TYPES,
	type ReleaseComputerSessionCommand,
	releaseComputerSessionCommandSchema,
} from "@anxionos/contracts/openbot";
import type { ComputerSessionPort } from "../../domain/ports/computer-session-port";

export interface ReleaseComputerSessionDeps {
	computerSession: ComputerSessionPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function releaseComputerSession(
	deps: ReleaseComputerSessionDeps,
	input: ReleaseComputerSessionCommand,
): Promise<ComputerSessionCommandResult> {
	const command = releaseComputerSessionCommandSchema.parse(input);
	const session = await deps.computerSession.releaseSession({
		sessionId: command.sessionId,
		organizationId: command.organizationId,
	});

	const payload = computerSessionReleasedPayloadSchema.parse({
		commandId: command.commandId,
		session,
	});

	if (deps.publishEvents) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.COMPUTER_SESSION_RELEASED,
				occurredAt: new Date().toISOString(),
				payload,
			}),
		]);
	}

	return computerSessionCommandResultSchema.parse({
		commandId: command.commandId,
		session,
	});
}
