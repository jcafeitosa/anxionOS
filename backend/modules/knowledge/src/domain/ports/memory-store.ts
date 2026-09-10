export interface MemoryEntryRecord {
	id: string;
	organizationId: string;
	tier: "CANDIDATE" | "PROMOTED";
	summary: string;
	contentHash: string;
	sourceDocumentId: string | null;
	createdAt: string;
	promotedAt: string | null;
}

export interface MemoryStorePort {
	findById(
		id: string,
		organizationId: string,
	): Promise<MemoryEntryRecord | null>;
	findByContentHash(
		organizationId: string,
		contentHash: string,
	): Promise<MemoryEntryRecord | null>;
	save(record: MemoryEntryRecord): Promise<MemoryEntryRecord>;
	update(record: MemoryEntryRecord): Promise<MemoryEntryRecord>;
	listByTier(
		organizationId: string,
		tier: "CANDIDATE" | "PROMOTED",
	): Promise<MemoryEntryRecord[]>;
}
