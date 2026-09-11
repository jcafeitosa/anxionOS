import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AGENCY_MEMBERSHIPS_COLLECTION_PATH,
	agencyMembershipsCollectionUrl,
	fetchAgencyMemberships,
	membershipDisplayLabel,
	membershipEmptyDescription,
	membershipsViewFromResponse,
	MEMBERSHIPS_COLLECTION_CONTRACT,
} from "./owner-memberships.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const MEMBERSHIP_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const realMembership = {
	id: MEMBERSHIP_ID,
	agencyId: AGENCY_ID,
	principalId: PRINCIPAL_ID,
	role: "owner" as const,
	status: "active" as const,
	joinedAt: "2026-01-01T00:00:00.000Z",
	revision: 1,
};

describe("agencyMembershipsCollectionUrl", () => {
	it("encodes the agencyId on the public organizations memberships path", () => {
		assert.equal(
			agencyMembershipsCollectionUrl(AGENCY_ID),
			`/v1/organizations/agencies/${AGENCY_ID}/memberships`,
		);
		assert.match(AGENCY_MEMBERSHIPS_COLLECTION_PATH, /memberships/);
	});
});

describe("membershipsViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(membershipsViewFromResponse(401, [realMembership]), {
			kind: "denied",
			status: 401,
		});
		assert.deepEqual(membershipsViewFromResponse(403, null), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 404/405 to empty collection_unavailable (no mock table)", () => {
		assert.deepEqual(membershipsViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty list to no_members", () => {
		assert.deepEqual(membershipsViewFromResponse(200, []), {
			kind: "empty",
			reason: "no_members",
			status: 200,
		});
	});

	it("maps 200 with DTOs to ready items", () => {
		const view = membershipsViewFromResponse(200, { items: [realMembership] });
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items.length, 1);
			assert.equal(view.items[0]?.role, "owner");
			assert.equal(view.items[0]?.id, MEMBERSHIP_ID);
		}
	});

	it("maps 200 with unknown JSON to stale instead of fake rows", () => {
		assert.deepEqual(membershipsViewFromResponse(200, { count: 3 }), {
			kind: "stale",
			status: 200,
		});
	});

	it("maps 500 to stale", () => {
		assert.deepEqual(membershipsViewFromResponse(500, null), {
			kind: "stale",
			status: 500,
		});
	});
});

describe("membershipEmptyDescription", () => {
	it("cites the collection contract", () => {
		assert.match(
			membershipEmptyDescription("collection_unavailable"),
			/GET \/v1\/organizations\/agencies\/:agencyId\/memberships/,
		);
		assert.ok(
			membershipEmptyDescription("no_members").includes(MEMBERSHIPS_COLLECTION_CONTRACT),
		);
	});
});

describe("membershipDisplayLabel", () => {
	it("labels invited memberships without principal", () => {
		assert.equal(
			membershipDisplayLabel({
				...realMembership,
				principalId: null,
				status: "invited",
			}),
			"convite pendente",
		);
	});
});

describe("fetchAgencyMemberships", () => {
	it("returns collection_unavailable on live 404", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: { message: "not found" } }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchAgencyMemberships(AGENCY_ID, fetchFn);
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
		const view = await fetchAgencyMemberships(AGENCY_ID, fetchFn);
		assert.deepEqual(view, { kind: "stale", status: null });
	});
});
