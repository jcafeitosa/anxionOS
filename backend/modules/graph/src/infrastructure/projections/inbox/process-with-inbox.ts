import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { Pool } from "pg";
import type { GraphStore } from "../../../domain/ports/graph-store";
import type { NatsMessagePort } from "../../../infrastructure/messaging/nats-message-port";
import { domainEventEnvelopeSchema } from "@anxionos/contracts/events";
import { GRAPH_PROJECTION_DEFAULT_CHECKPOINT, GRAPH_PROJECTION_MAX_ATTEMPTS, } from "../../../domain/projections/constants";
import { isProjectionError, ProjectionError, } from "../../../domain/projections/errors";
import { nakDelayMs } from "../../../infrastructure/messaging/nats-message-port";
import { buildRedactedPayloadRef, insertDlqEntry, } from "../../../infrastructure/persistence/dlq-repository";
import { ackInboxEntry, bumpProjectionGeneration, findProjectionGeneration, claimInboxForProcessing, markInboxPendingRetry, quarantineInboxEntry, } from "../../../infrastructure/persistence/inbox-repository";

function classifyError(error) {
    if (isProjectionError(error)) {
        return error;
    }
    return new ProjectionError(error instanceof Error ? error.message : "Unknown projection failure", "PROJECTION_TRANSIENT", "transient");
}
function shouldQuarantine(error, attemptCount, maxAttempts) {
    if (error.classification === "permanent") {
        return true;
    }
    return attemptCount >= maxAttempts;
}
async function quarantineAndAck(client, options, parsed, entry, errorCode, buildPayloadRef) {
    await quarantineInboxEntry(client, parsed.eventId, options.consumerName, errorCode);
    const dlqId = await insertDlqEntry(client, {
        eventId: parsed.eventId,
        consumerName: options.consumerName,
        ownerDomain: options.ownerDomain,
        errorCode,
        attemptCount: entry.attemptCount,
        payloadRef: buildPayloadRef(parsed),
    });
    await client.query("COMMIT");
    options.message?.ack();
    return {
        status: "quarantined" as const as const,
        errorCode,
        dlqId,
        attemptCount: entry.attemptCount,
    };
}
/** Idempotent inbox + Neo4j + PG generation bump; NATS ack only after COMMIT (GK-R06-02). */
export async function processWithInbox(options) {
    const parsed = domainEventEnvelopeSchema.parse(options.envelope);
    const checkpoint = options.checkpoint ?? GRAPH_PROJECTION_DEFAULT_CHECKPOINT;
    const maxAttempts = options.maxAttempts ?? GRAPH_PROJECTION_MAX_ATTEMPTS;
    const buildPayloadRef = options.buildPayloadRef ??
        ((envelope) => buildRedactedPayloadRef(envelope.eventId, options.consumerName));
    const client = await options.pool.connect();
    try {
        await client.query("BEGIN");
        const claim = await claimInboxForProcessing(client, {
            eventId: parsed.eventId,
            consumerName: options.consumerName,
            ownerDomain: options.ownerDomain,
            checkpoint,
            projectionGeneration: 0,
        });
        if (claim === "already_processed") {
            await client.query("ROLLBACK");
            options.message?.ack();
            const duplicateResult = { status: "duplicate" as const as const };
            await options.afterAck?.({
                envelope: parsed,
                result: duplicateResult,
            });
            return duplicateResult;
        }
        if (claim.status === "quarantined") {
            await client.query("ROLLBACK");
            options.message?.ack();
            return {
                status: "quarantined" as const as const,
                errorCode: "ALREADY_QUARANTINED",
                attemptCount: claim.attemptCount,
            };
        }
        const entry = claim;
        const nextGeneration = (await findProjectionGeneration(client, options.consumerName)) + 1;
        try {
            await options.project({
                graphStore: options.graphStore,
                projectionGeneration: nextGeneration,
                envelope: parsed,
            });
        }
        catch (error) {
            const classified = classifyError(error);
            if (shouldQuarantine(classified, entry.attemptCount, maxAttempts)) {
                return quarantineAndAck(client, options, parsed, entry, classified.code, buildPayloadRef);
            }
            await markInboxPendingRetry(client, parsed.eventId, options.consumerName, classified.code);
            await client.query("COMMIT");
            options.message?.nak(nakDelayMs(entry.attemptCount));
            return {
                status: "retry" as const as const,
                errorCode: classified.code,
                attemptCount: entry.attemptCount,
            };
        }
        const projectionGeneration = await bumpProjectionGeneration(client, options.consumerName);
        await ackInboxEntry(client, parsed.eventId, options.consumerName, checkpoint, projectionGeneration);
        await client.query("COMMIT");
        options.message?.ack();
        const processedResult = {
            status: "processed" as const as const,
            projectionGeneration,
        };
        await options.afterAck?.({
            envelope: parsed,
            result: processedResult,
        });
        return processedResult;
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
}

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
    pool: Pool;
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
/** Idempotent inbox + Neo4j + PG generation bump; NATS ack only after COMMIT (GK-R06-02). */
