import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	STRATEGIES_EVENT_TYPES,
	STRATEGIES_OWNER_DOMAIN,
} from "@anxionos/contracts/strategies";

export function createStrategyVersionPublishedEvent(input: {
	strategyId: string;
	strategyVersionId: string;
	organizationId: string;
	versionNumber: number;
	sourceHash: string;
	rulesHash: string;
	parametersHash: string;
	executionMode: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: STRATEGIES_EVENT_TYPES.VERSION_PUBLISHED,
		schemaVersion: "0.1.0",
		ownerDomain: STRATEGIES_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
