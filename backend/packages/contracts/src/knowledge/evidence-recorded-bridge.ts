import { z } from "zod";
import { evidenceRecordedPayloadSchema } from "./events";

export const knowledgeEvidenceRecordedBridgeSchema = evidenceRecordedPayloadSchema;

export type KnowledgeEvidenceRecordedBridge = z.infer<
	typeof knowledgeEvidenceRecordedBridgeSchema
>;

export function extractDecisionIdFromEvidenceSourceRefs(
	sourceRefs: KnowledgeEvidenceRecordedBridge["sourceRefs"],
): string | null {
	const decisionRef = sourceRefs.find((ref) => ref.kind === "decision");
	return decisionRef?.refId ?? null;
}

export interface AttachEvidenceFromKnowledgeInput {
	commandId: string;
	organizationId: string;
	decisionId: string;
	evidenceId: string;
	claimTextHash: string;
	provenanceKind: KnowledgeEvidenceRecordedBridge["provenanceKind"];
	knowledgeEventId: string;
}

export function mapEvidenceRecordedToAttachInput(
	evidence: KnowledgeEvidenceRecordedBridge,
	eventId: string,
): AttachEvidenceFromKnowledgeInput | null {
	const parsed = knowledgeEvidenceRecordedBridgeSchema.parse(evidence);
	const decisionId = extractDecisionIdFromEvidenceSourceRefs(parsed.sourceRefs);
	if (!decisionId) {
		return null;
	}
	return {
		commandId: eventId,
		organizationId: parsed.organizationId,
		decisionId,
		evidenceId: parsed.evidenceId,
		claimTextHash: parsed.claimTextHash,
		provenanceKind: parsed.provenanceKind,
		knowledgeEventId: eventId,
	};
}
