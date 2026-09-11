import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agencyOrdersCollectionUrl,
	fetchAgencyOrders,
	orderDisplayLabel,
	orderEmptyDescription,
	ordersViewFromResponse,
	ORDERS_COLLECTION_CONTRACT,
	EXECUTION_ORDERS_COLLECTION_PATH,
} from "./operator-orders.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const ORDER_ID = "ex_ord_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SESSION_ID = "ex_ses_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const realOrder = {
	orderId: ORDER_ID,
	organizationId: AGENCY_ID,
	sessionId: SESSION_ID,
	clientOrderId: "client-001",
	instrumentId: "BTC-USD",
	side: "BUY" as const,
	quantity: "0.5",
	price: "42000.00",
	status: "SUBMITTED" as const,
	executionMode: "PAPER" as const,
	submittedAt: "2026-01-01T00:00:00.000Z",
	revision: 1,
};

describe("agencyOrdersCollectionUrl", () => {
	it("encodes the agencyId on the public execution path", () => {
		assert.equal(
			agencyOrdersCollectionUrl(AGENCY_ID),
			`/v1/execution/agencies/${AGENCY_ID}/orders`,
		);
		assert.match(EXECUTION_ORDERS_COLLECTION_PATH, /orders/);
	});
});

describe("ordersViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(
			ordersViewFromResponse(401, { orders: [realOrder] }),
			{ kind: "denied", status: 401 },
		);
	});

	it("maps 404/405 to empty collection_unavailable", () => {
		assert.deepEqual(ordersViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty to no_orders", () => {
		assert.deepEqual(ordersViewFromResponse(200, { orders: [] }), {
			kind: "empty",
			reason: "no_orders",
			status: 200,
		});
	});

	it("maps 200 with orders array to ready", () => {
		const view = ordersViewFromResponse(200, { orders: [realOrder] });
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items[0]?.orderId, ORDER_ID);
		}
	});

	it("maps malformed body to stale", () => {
		assert.deepEqual(ordersViewFromResponse(200, { bad: true }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("fetchAgencyOrders", () => {
	it("uses fetchFn and maps network failure to stale", async () => {
		const view = await fetchAgencyOrders(AGENCY_ID, async () => {
			throw new Error("offline");
		});
		assert.deepEqual(view, { kind: "stale", status: null });
	});

	it("parses JSON collection on success", async () => {
		const view = await fetchAgencyOrders(AGENCY_ID, async () =>
			new Response(JSON.stringify({ orders: [realOrder] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		assert.equal(view.kind, "ready");
	});
});

describe("orderDisplayLabel", () => {
	it("includes side, status, instrument and quantity@price", () => {
		assert.equal(
			orderDisplayLabel(realOrder),
			"BUY · SUBMITTED · BTC-USD · 0.5@42000.00",
		);
	});
});

describe("orderEmptyDescription", () => {
	it("references the collection contract", () => {
		assert.match(
			orderEmptyDescription("no_orders"),
			new RegExp(ORDERS_COLLECTION_CONTRACT.slice(0, 20)),
		);
	});
});
