/**
 * ANX-277 — Product Graph domain event contracts (Zod v1).
 * Importers: `@anxionos/graph` product-graph-projector, projection worker, graph tests.
 * API: `product.work_item.status_changed.v1` → WorkItem node projection.
 * User instruction: implement AI Product Company Engine projection worker sandbox (ANX-277).
 */
import { z } from "zod";
import { institutionalUuidSchema } from "../../institutional-uuid";

export const PRODUCT_GRAPH_OWNER_DOMAIN = "product";

export const PRODUCT_GRAPH_EVENT_TYPES = {
	WORK_ITEM_STATUS_CHANGED: "product.work_item.status_changed.v1",
	INTELLIGENCE_FEEDS_BACK: "product.intelligence.feeds_back.v1",
} as const;

export const workItemStatusChangedPayloadSchema = z.object({
	workItemId: institutionalUuidSchema,
	companyId: institutionalUuidSchema,
	status: z.string().min(1),
	revision: z.number().int().nonnegative(),
	featureId: institutionalUuidSchema.optional(),
	title: z.string().min(1).optional(),
});

export type WorkItemStatusChangedPayload = z.infer<
	typeof workItemStatusChangedPayloadSchema
>;

export const intelligenceFeedsBackPayloadSchema = z.object({
	companyId: institutionalUuidSchema,
	monitorId: institutionalUuidSchema,
	problemId: institutionalUuidSchema,
	revision: z.number().int().nonnegative(),
	metricName: z.string().min(1),
	metricValue: z.number(),
	threshold: z.number(),
	unit: z.string().min(1).optional(),
	insightSummary: z.string().min(1),
	problemStatement: z.string().min(1),
	triggerDiscovery: z.boolean().default(true),
});

export type IntelligenceFeedsBackPayload = z.infer<
	typeof intelligenceFeedsBackPayloadSchema
>;

export type ProductGraphEventType =
	(typeof PRODUCT_GRAPH_EVENT_TYPES)[keyof typeof PRODUCT_GRAPH_EVENT_TYPES];
