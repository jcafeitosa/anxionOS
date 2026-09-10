import { randomUUID } from "node:crypto";
import type { ContextManifest, RetrievalHit } from "@anxionos/contracts/knowledge";
import { contextManifestSchema } from "@anxionos/contracts/knowledge";
import { hashText } from "./text-chunking";

export function buildContextManifest(input: {
	organizationId: string;
	queryText: string;
	hits: RetrievalHit[];
}): ContextManifest {
	return contextManifestSchema.parse({
		manifestId: randomUUID(),
		organizationId: input.organizationId,
		queryHash: hashText(input.queryText),
		hits: input.hits,
		generatedAt: new Date().toISOString(),
	});
}

export function recallAtK(
	expectedDocumentIds: string[],
	hits: RetrievalHit[],
	k: number,
): number {
	const top = hits.slice(0, k).map((hit) => hit.documentId);
	const found = expectedDocumentIds.filter((id) => top.includes(id));
	return expectedDocumentIds.length === 0
		? 0
		: found.length / expectedDocumentIds.length;
}
