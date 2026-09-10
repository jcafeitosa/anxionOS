import type {
	MemoryEntryRecord,
	MemoryStorePort,
} from "../../domain/ports/memory-store";

export function createInMemoryMemoryStore(): MemoryStorePort {
	const entries = new Map<string, MemoryEntryRecord>();

	return {
		async findById(id, organizationId) {
			const row = entries.get(id);
			return row && row.organizationId === organizationId ? row : null;
		},
		async findByContentHash(organizationId, contentHash) {
			for (const row of entries.values()) {
				if (
					row.organizationId === organizationId &&
					row.contentHash === contentHash
				) {
					return row;
				}
			}
			return null;
		},
		async save(record) {
			entries.set(record.id, record);
			return record;
		},
		async update(record) {
			entries.set(record.id, record);
			return record;
		},
		async listByTier(organizationId, tier) {
			return [...entries.values()].filter(
				(row) => row.organizationId === organizationId && row.tier === tier,
			);
		},
	};
}
