import { randomUUID } from "node:crypto";
import { schemaVersion } from "@anxionos/contracts";
import {
	KNOWLEDGE_EVENT_TYPES,
	KNOWLEDGE_OWNER_DOMAIN,
} from "@anxionos/contracts/knowledge";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export function createDocumentIndexedEvent(input: {
	documentId: string;
	documentVersionId: string;
	indexGenerationId: string;
	organizationId: string;
	contentHash: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: KNOWLEDGE_EVENT_TYPES.DOCUMENT_INDEXED,
		schemaVersion,
		ownerDomain: KNOWLEDGE_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createChunkEmbeddedEvent(input: {
	chunkId: string;
	documentVersionId: string;
	embeddingSpaceId: string;
	dimensions: number;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: KNOWLEDGE_EVENT_TYPES.CHUNK_EMBEDDED,
		schemaVersion,
		ownerDomain: KNOWLEDGE_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
