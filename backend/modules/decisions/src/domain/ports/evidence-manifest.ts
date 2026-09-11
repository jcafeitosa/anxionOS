export interface EvidenceManifestEntryRecord {
	id: string;
	decisionId: string;
	organizationId: string;
	evidenceId: string;
	claimTextHash: string;
	provenanceKind: string;
	knowledgeEventId?: string;
}

export interface EvidenceManifestRecord {
	decisionId: string;
	organizationId: string;
	manifestId: string;
	manifestHash: string;
	entryCount: number;
}

export interface EvidenceManifestRepository {
	findByDecisionId(decisionId: string): Promise<EvidenceManifestRecord | null>;
	findEntryByKnowledgeEventId(
		knowledgeEventId: string,
	): Promise<EvidenceManifestEntryRecord | null>;
	findEntriesByDecisionId(
		decisionId: string,
	): Promise<EvidenceManifestEntryRecord[]>;
	appendEntry(input: {
		id: string;
		decisionId: string;
		organizationId: string;
		evidenceId: string;
		claimTextHash: string;
		provenanceKind: string;
		knowledgeEventId?: string;
	}): Promise<EvidenceManifestEntryRecord>;
	upsertManifest(input: {
		decisionId: string;
		organizationId: string;
		manifestId: string;
		manifestHash: string;
		entryCount: number;
	}): Promise<EvidenceManifestRecord>;
}
