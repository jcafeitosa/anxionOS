import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Pool } from "pg";
import type { GraphStore } from "../domain/ports/graph-store";
import { type ProcessWithInboxResult, type ProjectionHandler } from "../application/projections/inbox/projection-handler";
import type { NatsMessagePort } from "../infrastructure/messaging/nats-message-port";
import { processWithInbox, } from "../infrastructure/projections/inbox/process-with-inbox";

/** Worker entrypoint: inbox idempotency, poison pill, NATS ack after COMMIT. */
export async function handleProjectionMessage(input) {
    return processWithInbox({
        pool: input.pool,
        graphStore: input.graphStore,
        consumerName: input.consumer.consumerName,
        ownerDomain: input.consumer.ownerDomain,
        envelope: input.envelope,
        project: input.consumer.project,
        checkpoint: input.checkpoint,
        message: input.message,
    });
}

export interface GraphProjectionConsumerDefinition {
    consumerName: string;
    ownerDomain: string;
    project: ProjectionHandler;
}

export interface HandleProjectionMessageInput {
    pool: Pool;
    graphStore: GraphStore;
    consumer: GraphProjectionConsumerDefinition;
    envelope: DomainEventEnvelope;
    checkpoint?: number;
    message?: NatsMessagePort;
}
/** Worker entrypoint: inbox idempotency, poison pill, NATS ack after COMMIT. */
