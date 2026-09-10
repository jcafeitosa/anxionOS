import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export interface InboxConsumer {
	name: string;
	handle(envelope: DomainEventEnvelope): Promise<void>;
}

export interface InboxProcessorPort {
	process(
		consumer: InboxConsumer,
		envelope: DomainEventEnvelope,
	): Promise<"processed" | "skipped">;
}
