import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AGENTS_COLLECTION_CONTRACT,
	agencyAgentsCollectionUrl,
	catalogEmptyDescription,
	catalogViewFromResponse,
	fetchAgencyAgentsCatalog,
} from "./agency-agents-catalog.ts";

const AGENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_ID = "11111111-1111-4111-8111-111111111111";

const realAgent = {
	id: AGENT_ID,
	organizationId: AGENCY_ID,
	kind: "AGENCY",
	displayName: "Research desk",
	status: "ACTIVE",
	activeVersionId: null,
	revision: 1,
};

describe("agencyAgentsCollectionUrl", () => {
	it("encodes the membership agencyId on the public collection path", () => {
		assert.equal(
			agencyAgentsCollectionUrl(AGENCY_ID),
			`/v1/agencies/${AGENCY_ID}/agents`,
		);
	});
});

describe("catalogViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(catalogViewFromResponse(401, { agents: [realAgent] }), {
			kind: "denied",
			status: 401,
		});
		assert.deepEqual(catalogViewFromResponse(403, null), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 404/405 to empty collection_unavailable (no mock table)", () => {
		assert.deepEqual(catalogViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
		assert.deepEqual(catalogViewFromResponse(422, { error: "validation" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 422,
		});
	});

	it("maps 200 empty list to no_agents", () => {
		assert.deepEqual(catalogViewFromResponse(200, { agents: [] }), {
			kind: "empty",
			reason: "no_agents",
			status: 200,
		});
		assert.deepEqual(catalogViewFromResponse(200, []), {
			kind: "empty",
			reason: "no_agents",
			status: 200,
		});
	});

	it("maps 200 with DTOs to ready items", () => {
		const view = catalogViewFromResponse(200, { items: [realAgent] });
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items.length, 1);
			assert.equal(view.items[0]?.displayName, "Research desk");
			assert.equal(view.items[0]?.id, AGENT_ID);
		}
	});

	it("maps 200 with unknown JSON to stale instead of fake rows", () => {
		assert.deepEqual(catalogViewFromResponse(200, { count: 12, fake: true }), {
			kind: "stale",
			status: 200,
		});
	});

	it("maps 500 to stale", () => {
		assert.deepEqual(catalogViewFromResponse(500, null), {
			kind: "stale",
			status: 500,
		});
	});
});

describe("catalogEmptyDescription", () => {
	it("cites the collection contract", () => {
		assert.match(
			catalogEmptyDescription("collection_unavailable"),
			/GET \/v1\/agencies\/:agencyId\/agents/,
		);
		assert.ok(
			catalogEmptyDescription("collection_unavailable").includes(
				AGENTS_COLLECTION_CONTRACT,
			),
		);
	});
});

describe("fetchAgencyAgentsCatalog", () => {
	it("returns collection_unavailable on live 404", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: { message: "not found" } }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchAgencyAgentsCatalog(AGENCY_ID, fetchFn);
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
		const view = await fetchAgencyAgentsCatalog(AGENCY_ID, fetchFn);
		assert.deepEqual(view, { kind: "stale", status: null });
	});
});
