import { z } from "zod";

export const EXECUTION_ORDERS_COLLECTION_PATH =
	"/v1/execution/agencies/:agencyId/orders";

/** Public execution query — open orders for agency scope (ANX-165 S4). */
export const ORDERS_COLLECTION_CONTRACT =
	"GET /v1/execution/agencies/:agencyId/orders (collection). Montado em apps/api via createExecutionPlugin; DTO alinhado a executionOrderStatusSchema e executionOrderSideSchema em @anxionos/contracts/execution. Cancel/reconcile = slices futuros com Idempotency-Key.";

const executionOrderStatusSchema = z.enum([
	"SUBMITTED",
	"PARTIALLY_FILLED",
	"FILLED",
	"CANCELLED",
]);

const executionOrderSideSchema = z.enum(["BUY", "SELL"]);

const executionModuleModeSchema = z.enum(["SIMULATED", "PAPER"]);

const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);

export const orderItemSchema = z.object({
	orderId: z.string().regex(/^ex_ord_[0-9a-f-]{36}$/i),
	organizationId: z.string().uuid(),
	sessionId: z.string().regex(/^ex_ses_[0-9a-f-]{36}$/i),
	clientOrderId: z.string().min(1).max(128),
	instrumentId: z.string().min(1).max(128),
	side: executionOrderSideSchema,
	quantity: decimalAmountSchema,
	price: decimalAmountSchema,
	status: executionOrderStatusSchema,
	executionMode: executionModuleModeSchema,
	submittedAt: z.string().datetime(),
	revision: z.number().int().positive().optional(),
});

export type OrderItem = z.infer<typeof orderItemSchema>;

const collectionBodySchema = z.union([
	z.array(orderItemSchema),
	z.object({ orders: z.array(orderItemSchema) }),
	z.object({ items: z.array(orderItemSchema) }),
]);

export type AgencyOrdersView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly OrderItem[] }
	| { kind: "empty"; reason: "no_orders" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyOrdersFetchFn = typeof fetch;

export function agencyOrdersCollectionUrl(agencyId: string): string {
	return `/v1/execution/agencies/${encodeURIComponent(agencyId)}/orders`;
}

function itemsFromBody(body: unknown): OrderItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("orders" in parsed.data) {
		return parsed.data.orders;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency orders collection. 404/405 mean the
 * public list surface is absent — honest empty, not a mock queue.
 */
export function ordersViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyOrdersView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405 || status === 422) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const items = itemsFromBody(body);
	if (items === null) {
		return { kind: "stale", status };
	}
	if (items.length === 0) {
		return { kind: "empty", reason: "no_orders", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyOrders(
	agencyId: string,
	fetchFn: AgencyOrdersFetchFn = fetch,
): Promise<Exclude<AgencyOrdersView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyOrdersCollectionUrl(agencyId), {
			credentials: "include",
			headers: { Accept: "application/json" },
		});
	} catch {
		return { kind: "stale", status: null };
	}

	let body: unknown = null;
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			body = await response.json();
		} catch {
			return { kind: "stale", status: response.status };
		}
	}

	return ordersViewFromResponse(response.status, body);
}

export function orderEmptyDescription(
	reason: "no_orders" | "collection_unavailable",
): string {
	if (reason === "no_orders") {
		return `Nenhuma ordem aberta nesta agência. Contrato: ${ORDERS_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${ORDERS_COLLECTION_CONTRACT}`;
}

export function orderDisplayLabel(item: OrderItem): string {
	return `${item.side} · ${item.status} · ${item.instrumentId} · ${item.quantity}@${item.price}`;
}
