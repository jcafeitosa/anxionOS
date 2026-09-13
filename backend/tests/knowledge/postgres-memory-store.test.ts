import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	createPgMemoryStore,
	ensureKnowledgeSchema,
} from "@anxionos/knowledge";
import type { MemoryEntryRecord } from "../../modules/knowledge/src/domain/ports/memory-store";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
} from "../pg-harness-guard";

type QueryResponse = { rows: Array<Record<string, unknown>> };

function createQueryable(responses: QueryResponse[]) {
	const queries: Array<{ text: string; values: unknown[] }> = [];
	return {
		queries,
		query: async (text: string, values: unknown[] = []) => {
			queries.push({ text, values });
			const response = responses.shift();
			if (!response) throw new Error("unexpected query");
			return response;
		},
	};
}

const record: MemoryEntryRecord = {
	id: "kn_mem_1",
	organizationId: "org-a",
	tier: "CANDIDATE",
	summary: "Conservative sizing",
	contentHash: "a".repeat(64),
	sourceDocumentId: null,
	createdAt: "2026-09-13T00:00:00.000Z",
	promotedAt: null,
};

function row(overrides: Partial<MemoryEntryRecord> = {}) {
	const value = { ...record, ...overrides };
	return {
		id: value.id,
		organization_id: value.organizationId,
		tier: value.tier,
		summary: value.summary,
		content_hash: value.contentHash,
		source_document_id: value.sourceDocumentId,
		created_at: value.createdAt,
		promoted_at: value.promotedAt,
	};
}

describe("PostgreSQL memory store", () => {
	test("scopes reads by organization and maps the persisted record", async () => {
		const client = createQueryable([{ rows: [row()] }]);
		const store = createPgMemoryStore(client);

		expect(await store.findById(record.id, record.organizationId)).toEqual(
			record,
		);
		expect(client.queries[0]?.values).toEqual([
			record.id,
			record.organizationId,
		]);
		expect(client.queries[0]?.text).toContain("organization_id = $2");
	});

	test("does not duplicate a natural key when an insert loses a race", async () => {
		const client = createQueryable([{ rows: [] }, { rows: [row()] }]);
		const store = createPgMemoryStore(client);

		expect(await store.save(record)).toEqual(record);
		expect(client.queries[0]?.text).toContain("ON CONFLICT");
		expect(client.queries[0]?.text).toContain("DO NOTHING");
	});

	test("updates the tenant-scoped tier and promotion timestamp", async () => {
		const promotedAt = "2026-09-13T12:00:00.000Z";
		const promoted = { ...record, tier: "PROMOTED" as const, promotedAt };
		const client = createQueryable([{ rows: [row(promoted)] }]);
		const store = createPgMemoryStore(client);

		expect(await store.update(promoted)).toEqual(promoted);
		expect(client.queries[0]?.values).toEqual([
			promoted.id,
			promoted.organizationId,
			promoted.tier,
			promoted.promotedAt,
		]);
		expect(client.queries[0]?.text).toContain("organization_id = $2");
	});
});

describe("PostgreSQL memory store integration", () => {
	test("persists lifecycle, isolates tenants, and dedupes concurrent natural keys", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const databaseUrl = getDatabaseUrl();
		if (!databaseUrl) return;

		const pool = createPgPool(databaseUrl);
		const organizationId = `memory-${randomUUID()}`;
		const otherOrganizationId = `memory-other-${randomUUID()}`;
		try {
			await ensureKnowledgeSchema(pool);
			const store = createPgMemoryStore(pool);
			const first = { ...record, id: `kn_mem_${randomUUID()}`, organizationId };
			const concurrent = await Promise.all(
				Array.from({ length: 8 }, (_, index) =>
					store.save({
						...first,
						id: `kn_mem_${index}_${randomUUID()}`,
					}),
				),
			);

			expect(new Set(concurrent.map((entry) => entry.id)).size).toBe(1);
			const saved = concurrent[0];
			if (!saved) throw new Error("concurrent save returned no record");
			expect(await store.findById(saved.id, otherOrganizationId)).toBeNull();
			const promoted = {
				...saved,
				tier: "PROMOTED" as const,
				promotedAt: "2026-09-13T12:00:00.000Z",
			};
			expect(await store.update(promoted)).toEqual(promoted);
			expect(await store.listByTier(organizationId, "PROMOTED")).toEqual([
				promoted,
			]);
		} finally {
			await pool.query(
				"DELETE FROM knowledge_memories WHERE organization_id = ANY($1::text[])",
				[[organizationId, otherOrganizationId]],
			);
			await pool.end();
		}
	});
});
