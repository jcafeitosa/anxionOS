import { randomUUID } from "node:crypto";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import {
	type ComputerSessionTakeoverResult,
	computerSessionTakeoverPayloadSchema,
	computerSessionTakeoverResultSchema,
	OPENBOT_EVENT_TYPES,
	type TakeoverComputerSessionCommand,
	takeoverComputerSessionCommandSchema,
} from "@anxionos/contracts/openbot";
import type { ComputerSessionPort } from "../../domain/ports/computer-session-port";

export interface TakeoverComputerSessionDeps {
	computerSession: ComputerSessionPort;
	publishEvents?: (
		events: ReturnType<typeof domainEventEnvelopeSchema.parse>[],
	) => Promise<void>;
}

export async function takeoverComputerSession(
	deps: TakeoverComputerSessionDeps,
	input: TakeoverComputerSessionCommand,
): Promise<ComputerSessionTakeoverResult> {
	const command = takeoverComputerSessionCommandSchema.parse(input);
	const outcome = await deps.computerSession.takeoverSession({
		sessionId: command.sessionId,
		organizationId: command.organizationId,
		operatorId: command.operatorId,
	});

	const payload = computerSessionTakeoverPayloadSchema.parse({
		commandId: command.commandId,
		session: outcome.session,
		operatorId: command.operatorId,
		revokedAuthorityToken: outcome.revokedAuthorityToken,
		previousController: outcome.previousController,
	});

	if (deps.publishEvents) {
		await deps.publishEvents([
			domainEventEnvelopeSchema.parse({
				eventId: randomUUID(),
				schemaVersion: "0.1.0",
				ownerDomain: "openbot",
				eventType: OPENBOT_EVENT_TYPES.COMPUTER_SESSION_TAKEOVER,
				occurredAt: new Date().toISOString(),
				payload,
			}),
		]);
	}

	return computerSessionTakeoverResultSchema.parse({
		commandId: command.commandId,
		session: outcome.session,
		revokedAuthorityToken: outcome.revokedAuthorityToken,
		previousController: outcome.previousController,
	});
}
