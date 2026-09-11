import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AGENCY_PORTFOLIOS_COLLECTION_PATH,
	agencyPortfoliosCollectionUrl,
	fetchAgencyFinanceOverview,
	financeEmptyDescription,
	financeViewFromResponse,
	FINANCE_COLLECTION_CONTRACT,
	portfolioDisplayLabel,
	valuationDisplayLabel,
} from "./owner-finance.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";

const realPortfolio = {
	id: "pf_test_001",
	name: "Simulated Core",
	baseCurrency: "USD",
	executionMode: "SIMULATED",
	status: "ACTIVE",
	positionCount: 2,
	latestValuation: {
		id: "pf_val_001",
		asOf: "2026-09-10T12:00:00.000Z",
		navBase: "100000.00",
		status: "CONFIRMED",
		qualityFlags: [] as string[],
	},
};

describe("agencyPortfoliosCollectionUrl", () => {
	it("encodes the agencyId on the public portfolios path", () => {
		assert.equal(
			agencyPortfoliosCollectionUrl(AGENCY_ID),
			`/v1/agencies/${AGENCY_ID}/portfolios`,
		);
		assert.match(AGENCY_PORTFOLIOS_COLLECTION_PATH, /portfolios/);
	});
});

describe("financeViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(financeViewFromResponse(401, { portfolios: [realPortfolio] }), {
			kind: "denied",
			status: 401,
		});
		assert.deepEqual(financeViewFromResponse(403, null), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 404/405 to honest empty collection_unavailable", () => {
		assert.deepEqual(financeViewFromResponse(404, null), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps empty array to no_portfolios", () => {
		assert.deepEqual(financeViewFromResponse(200, { portfolios: [] }), {
			kind: "empty",
			reason: "no_portfolios",
			status: 200,
		});
	});

	it("accepts portfolios wrapper from live API", () => {
		assert.deepEqual(financeViewFromResponse(200, { portfolios: [realPortfolio] }), {
			kind: "ready",
			items: [realPortfolio],
		});
	});

	it("maps malformed body to stale", () => {
		assert.deepEqual(financeViewFromResponse(200, { bad: true }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("portfolioDisplayLabel", () => {
	it("never invents NAV when valuation is absent", () => {
		assert.match(
			portfolioDisplayLabel({ ...realPortfolio, latestValuation: null }),
			/valuation ausente/,
		);
	});
});

describe("valuationDisplayLabel", () => {
	it("includes status, nav and asOf from API DTO", () => {
		assert.match(
			valuationDisplayLabel(realPortfolio.latestValuation!, "USD"),
			/CONFIRMED · 100000\.00 USD · asOf/,
		);
	});
});

describe("financeEmptyDescription", () => {
	it("cites FINANCE_COLLECTION_CONTRACT", () => {
		assert.match(financeEmptyDescription("no_portfolios"), /GET \/v1\/agencies/);
		assert.ok(
			financeEmptyDescription("collection_unavailable").includes(
				"listAgencyPortfolioOverview",
			),
		);
	});
});

describe("fetchAgencyFinanceOverview", () => {
	it("uses credentials include on the collection GET", async () => {
		let capturedUrl = "";
		let capturedInit: RequestInit | undefined;
		await fetchAgencyFinanceOverview(AGENCY_ID, async (url, init) => {
			capturedUrl = String(url);
			capturedInit = init;
			return new Response(JSON.stringify({ portfolios: [realPortfolio] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});
		assert.equal(capturedUrl, `/v1/agencies/${AGENCY_ID}/portfolios`);
		assert.equal(capturedInit?.credentials, "include");
	});
});
