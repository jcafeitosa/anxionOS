import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	type AcquireComputerSessionCommand,
	acquireComputerSessionCommandSchema,
	type ComputerSessionCommandResult,
	computerSessionAcquiredPayloadSchema,
	computerSessionCommandResultSchema,
	OPENBOT_EVENT_TYPES,
} from "@anxionos/contracts/openbot";
import type { ComputerSessionPort } from "../../domain/ports/computer-session-port";

export interface AcquireComputerSessionDeps {
	computerSession: ComputerSessionPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function acquireComputerSession(
	deps: AcquireComputerSessionDeps,
	input: AcquireComputerSessionCommand,
): Promise<ComputerSessionCommandResult> {
	const command = acquireComputerSessionCommandSchema.parse(input);
	const session = await deps.computerSession.acquireSession({
		organizationId: command.organizationId,
		agentId: command.agentId,
	});

	const payload = computerSessionAcquiredPayloadSchema.parse({
		commandId: command.commandId,
		session,
	});

	if (deps.publishEvents) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.COMPUTER_SESSION_ACQUIRED,
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
