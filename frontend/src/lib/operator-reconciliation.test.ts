import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agencyReconciliationCollectionUrl,
	fetchAgencyReconciliationCases,
	reconciliationDisplayLabel,
	reconciliationEmptyDescription,
	reconciliationViewFromResponse,
	RECONCILIATION_COLLECTION_CONTRACT,
	EXECUTION_RECONCILIATION_COLLECTION_PATH,
} from "./operator-reconciliation.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const CASE_ID = "ex_rc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "ex_ord_bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const realCase = {
	reconciliationCaseId: CASE_ID,
	organizationId: AGENCY_ID,
	caseKind: "FILL_MISSING" as const,
	status: "OPEN" as const,
	orderId: ORDER_ID,
	fillId: null,
	venueAdapterRefId: "ex_vad_sim_001",
	venueFillId: "venue-fill-42",
	evidence: null,
	disposition: null,
	dispositionRationale: null,
	openedAt: "2026-01-01T00:00:00.000Z",
	resolvedAt: null,
};

describe("agencyReconciliationCollectionUrl", () => {
	it("encodes the agencyId on the public execution path", () => {
		assert.equal(
			agencyReconciliationCollectionUrl(AGENCY_ID),
			`/v1/execution/agencies/${AGENCY_ID}/reconciliation-cases`,
		);
		assert.match(EXECUTION_RECONCILIATION_COLLECTION_PATH, /reconciliation-cases/);
	});
});

describe("reconciliationViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(
			reconciliationViewFromResponse(401, { reconciliationCases: [realCase] }),
			{ kind: "denied", status: 401 },
		);
	});

	it("maps 404/405 to empty collection_unavailable", () => {
		assert.deepEqual(reconciliationViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty to no_cases", () => {
		assert.deepEqual(
			reconciliationViewFromResponse(200, { reconciliationCases: [] }),
			{
				kind: "empty",
				reason: "no_cases",
				status: 200,
			},
		);
	});

	it("maps 200 with reconciliationCases array to ready", () => {
		const view = reconciliationViewFromResponse(200, {
			reconciliationCases: [realCase],
		});
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items[0]?.reconciliationCaseId, CASE_ID);
		}
	});

	it("maps malformed body to stale", () => {
		assert.deepEqual(reconciliationViewFromResponse(200, { bad: true }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("fetchAgencyReconciliationCases", () => {
	it("uses fetchFn and maps network failure to stale", async () => {
		const view = await fetchAgencyReconciliationCases(AGENCY_ID, async () => {
			throw new Error("offline");
		});
		assert.deepEqual(view, { kind: "stale", status: null });
	});

	it("parses JSON collection on success", async () => {
		const view = await fetchAgencyReconciliationCases(AGENCY_ID, async () =>
			new Response(JSON.stringify({ reconciliationCases: [realCase] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		assert.equal(view.kind, "ready");
	});
});

describe("reconciliationDisplayLabel", () => {
	it("includes caseKind, status and reconciliationCaseId", () => {
		assert.equal(
			reconciliationDisplayLabel(realCase),
			`FILL_MISSING · OPEN · ${CASE_ID}`,
		);
	});
});

describe("reconciliationEmptyDescription", () => {
	it("references the collection contract", () => {
		assert.match(
			reconciliationEmptyDescription("no_cases"),
			new RegExp(RECONCILIATION_COLLECTION_CONTRACT.slice(0, 20)),
		);
	});
});
