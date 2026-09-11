import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AGENCY_GRANTS_COLLECTION_PATH,
	agencyGrantsCollectionUrl,
	fetchAgencyGrants,
	grantDisplayLabel,
	grantEmptyDescription,
	grantsViewFromResponse,
	GRANTS_COLLECTION_CONTRACT,
} from "./owner-grants.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const GRANT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SCOPE_ID = AGENCY_ID;

const realGrant = {
	id: GRANT_ID,
	scopeId: SCOPE_ID,
	granteePrincipalId: PRINCIPAL_ID,
	capability: "owner.read",
	status: "active" as const,
	validFrom: "2026-01-01T00:00:00.000Z",
	validUntil: "2027-01-01T00:00:00.000Z",
	authorityEpochAtIssue: 1,
	revision: 1,
};

describe("agencyGrantsCollectionUrl", () => {
	it("encodes the agencyId on the public governance grants path", () => {
		assert.equal(
			agencyGrantsCollectionUrl(AGENCY_ID),
			`/v1/agencies/${AGENCY_ID}/grants`,
		);
		assert.match(AGENCY_GRANTS_COLLECTION_PATH, /grants/);
	});
});

describe("grantsViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(grantsViewFromResponse(401, { grants: [realGrant] }), {
			kind: "denied",
			status: 401,
		});
		assert.deepEqual(grantsViewFromResponse(403, null), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 404/405 to empty collection_unavailable (no mock table)", () => {
		assert.deepEqual(grantsViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty grants to no_grants", () => {
		assert.deepEqual(grantsViewFromResponse(200, { grants: [] }), {
			kind: "empty",
			reason: "no_grants",
			status: 200,
		});
	});

	it("maps 200 with DTOs to ready items", () => {
		const view = grantsViewFromResponse(200, { grants: [realGrant] });
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items.length, 1);
			assert.equal(view.items[0]?.capability, "owner.read");
			assert.equal(view.items[0]?.id, GRANT_ID);
		}
	});

	it("maps 200 with unknown JSON to stale instead of fake rows", () => {
		assert.deepEqual(grantsViewFromResponse(200, { count: 3 }), {
			kind: "stale",
			status: 200,
		});
	});

	it("maps 500 to stale", () => {
		assert.deepEqual(grantsViewFromResponse(500, null), {
			kind: "stale",
			status: 500,
		});
	});
});

describe("grantEmptyDescription", () => {
	it("cites the collection contract", () => {
		assert.match(
			grantEmptyDescription("collection_unavailable"),
			/GET \/v1\/agencies\/:agencyId\/grants/,
		);
		assert.ok(grantEmptyDescription("no_grants").includes(GRANTS_COLLECTION_CONTRACT));
	});
});

describe("grantDisplayLabel", () => {
	it("labels capability and status", () => {
		assert.equal(grantDisplayLabel(realGrant), "owner.read · active");
	});
});

describe("fetchAgencyGrants", () => {
	it("returns collection_unavailable on live 404", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: { message: "not found" } }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchAgencyGrants(AGENCY_ID, fetchFn);
		assert.deepEqual(view, {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("returns stale when fetch throws", async () => {
		const fetchFn: typeof fetch = async () => {
			throw new TypeError("network");
		};
		const view = await fetchAgencyGrants(AGENCY_ID, fetchFn);
		assert.deepEqual(view, { kind: "stale", status: null });
	});
});
