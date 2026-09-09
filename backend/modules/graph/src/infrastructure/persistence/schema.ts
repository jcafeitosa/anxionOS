import { bigint, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid, } from "drizzle-orm/pg-core";

export const graphSchemaStatusEnum = pgEnum("graph_schema_status", [
    "active",
    "deprecated",
    "disabled",
]);
export const graphInboxStatusEnum = pgEnum("graph_inbox_status", [
    "pending",
    "processing",
    "acked",
    "quarantined",
]);
export const graphRebuildStatusEnum = pgEnum("graph_rebuild_status", [
    "pending",
    "draining",
    "rebuilding",
    "verifying",
    "completed",
    "failed",
]);
export const graphDlqReplayStatusEnum = pgEnum("graph_dlq_replay_status", [
    "open",
    "replayed",
    "discarded",
]);
export const graphTraversalCacheableEnum = pgEnum("graph_traversal_cacheable", [
    "never",
    "conditional",
    "always",
]);
export const graphSchemaNodeTypes = pgTable("graph_schema_node_types", {
    nodeType: text("node_type").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    ownerDomain: text("owner_domain").notNull(),
    status: graphSchemaStatusEnum("status").notNull().default("active"),
    payloadSchemaRef: text("payload_schema_ref").notNull(),
    checksum: text("checksum").notNull(),
    activatedAt: timestamp("activated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.nodeType, table.schemaVersion] }),
    index("graph_schema_node_types_owner_domain_idx").on(table.ownerDomain),
]);
export const graphSchemaEdgeTypes = pgTable("graph_schema_edge_types", {
    edgeTypeId: text("edge_type_id").primaryKey(),
    edgeType: text("edge_type").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    fromNodeTypes: jsonb("from_node_types").notNull(),
    toNodeTypes: jsonb("to_node_types").notNull(),
    writerDomain: text("writer_domain").notNull(),
    cardinality: text("cardinality").notNull(),
    temporal: integer("temporal").notNull().default(0),
    crossScopePolicy: text("cross_scope_policy").notNull(),
    status: graphSchemaStatusEnum("status").notNull().default("active"),
    activatedAt: timestamp("activated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    index("graph_schema_edge_types_writer_domain_idx").on(table.writerDomain),
]);
export const graphRegistryGeneration = pgTable("graph_registry_generation", {
    id: text("id").primaryKey().default("current"),
    generation: bigint("generation", { mode: "number" }).notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const graphTraversalCatalog = pgTable("graph_traversal_catalog", {
    traversalId: text("traversal_id").notNull(),
    queryVersion: integer("query_version").notNull(),
    class: text("class").notNull(),
    edgeAllowlist: jsonb("edge_allowlist").notNull(),
    inputSchemaRef: text("input_schema_ref").notNull(),
    outputSchemaRef: text("output_schema_ref").notNull(),
    maxDepth: integer("max_depth").notNull().default(8),
    maxVisited: integer("max_visited").notNull().default(256),
    cacheable: graphTraversalCacheableEnum("cacheable").notNull().default("never"),
    fixtureVersion: text("fixture_version").notNull().default("f0"),
    registryGeneration: bigint("registry_generation", { mode: "number" })
        .notNull()
        .default(1),
    activatedAt: timestamp("activated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.traversalId, table.queryVersion] }),
]);
export const graphProjectionInbox = pgTable("graph_projection_inbox", {
    eventId: text("event_id").notNull(),
    consumerName: text("consumer_name").notNull(),
    ownerDomain: text("owner_domain").notNull(),
    status: graphInboxStatusEnum("status").notNull().default("pending"),
    checkpoint: bigint("checkpoint", { mode: "number" }).notNull().default(0),
    projectionGeneration: bigint("projection_generation", { mode: "number" })
        .notNull()
        .default(0),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    attemptCount: integer("attempt_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [
    primaryKey({ columns: [table.eventId, table.consumerName] }),
    index("graph_projection_inbox_status_idx").on(table.status),
    index("graph_projection_inbox_owner_domain_idx").on(table.ownerDomain),
]);
export const graphRebuildJobs = pgTable("graph_rebuild_jobs", {
    jobId: uuid("job_id").primaryKey().defaultRandom(),
    status: graphRebuildStatusEnum("status").notNull().default("pending"),
    targetGeneration: bigint("target_generation", { mode: "number" }).notNull(),
    cutoffCheckpoint: bigint("cutoff_checkpoint", { mode: "number" }).notNull(),
    ownerDomainOrder: jsonb("owner_domain_order").notNull(),
    registryGeneration: bigint("registry_generation", { mode: "number" }).notNull(),
    auditManifestId: uuid("audit_manifest_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (table) => [index("graph_rebuild_jobs_status_idx").on(table.status)]);
export const graphProjectionGeneration = pgTable("graph_projection_generation", {
    consumerName: text("consumer_name").primaryKey(),
    generation: bigint("generation", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const graphCurrentGeneration = pgTable("graph_current_generation", {
    id: text("id").primaryKey().default("current"),
    generation: bigint("generation", { mode: "number" }).notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const graphProjectionDlq = pgTable("graph_projection_dlq", {
    dlqId: uuid("dlq_id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(),
    consumerName: text("consumer_name").notNull(),
    ownerDomain: text("owner_domain").notNull(),
    quarantinedAt: timestamp("quarantined_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    errorCode: text("error_code").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    payloadRef: text("payload_ref").notNull(),
    replayStatus: graphDlqReplayStatusEnum("replay_status")
        .notNull()
        .default("open"),
    auditManifestId: uuid("audit_manifest_id"),
}, (table) => [
    index("graph_projection_dlq_replay_status_idx").on(table.replayStatus),
    index("graph_projection_dlq_consumer_name_idx").on(table.consumerName),
]);

export type GraphSchemaNodeTypeRow = typeof graphSchemaNodeTypes.$inferSelect;

export type GraphProjectionInboxRow = typeof graphProjectionInbox.$inferSelect;

export type GraphRebuildJobRow = typeof graphRebuildJobs.$inferSelect;
