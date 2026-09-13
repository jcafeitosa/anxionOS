import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const knowledgeMemories = pgTable(
	"knowledge_memories",
	{
		id: text("id").primaryKey(),
		organizationId: text("organization_id").notNull(),
		tier: text("tier").notNull(),
		summary: text("summary").notNull(),
		contentHash: text("content_hash").notNull(),
		sourceDocumentId: text("source_document_id"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
		promotedAt: timestamp("promoted_at", { withTimezone: true }),
	},
	(table) => [
		index("knowledge_memories_org_tier_created_idx").on(
			table.organizationId,
			table.tier,
			table.createdAt,
			table.id,
		),
	],
);
