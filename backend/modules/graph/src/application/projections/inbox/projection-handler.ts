import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { GraphDatabasePool } from "../../../domain/ports/graph-database-pool";
import type { GraphStore } from "../../../domain/ports/graph-store";
import type { NatsMessagePort } from "../../../domain/ports/nats-message-port";

export interface ProjectionHandlerContext {
	graphStore: GraphStore;
	projectionGeneration: number;
	envelope: DomainEventEnvelope;
}

export type ProjectionHandler = (context: ProjectionHandlerContext) => Promise<void>;

export type ProcessWithInboxStatus = "processed" | "duplicate" | "quarantined" | "retry";

export interface ProcessWithInboxResult {
	status: ProcessWithInboxStatus;
	projectionGeneration?: number;
	errorCode?: string;
	dlqId?: string;
	attemptCount?: number;
}

export interface ProcessWithInboxOptions {
	pool: GraphDatabasePool;
	graphStore: GraphStore;
	consumerName: string;
	ownerDomain: string;
	envelope: DomainEventEnvelope;
	project: ProjectionHandler;
	checkpoint?: number;
	maxAttempts?: number;
	message?: NatsMessagePort;
	buildPayloadRef?: (envelope: DomainEventEnvelope) => string;
	/** GK-R05-03: cache pub/sub invalidate only after inbox COMMIT + NATS ack */
	afterAck?: (input: {
		envelope: DomainEventEnvelope;
		result: ProcessWithInboxResult;
	}) => void | Promise<void>;
}
