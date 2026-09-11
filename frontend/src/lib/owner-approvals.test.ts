import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AGENCY_CHANGE_PROPOSALS_COLLECTION_PATH,
	agencyChangeProposalsCollectionUrl,
	approvalDisplayLabel,
	approvalEmptyDescription,
	approvalsViewFromResponse,
	APPROVALS_COLLECTION_CONTRACT,
	fetchAgencyChangeProposals,
} from "./owner-approvals.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const PROPOSAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const realProposal = {
	id: PROPOSAL_ID,
	tenantId: AGENCY_ID,
	agencyId: AGENCY_ID,
	scopeId: AGENCY_ID,
	kind: "INSTITUTIONAL" as const,
	payloadHash: "sha256:demo",
	proposerPrincipalId: PRINCIPAL_ID,
	status: "pending" as const,
	requiredApprovals: 1,
	revision: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("agencyChangeProposalsCollectionUrl", () => {
	it("encodes the agencyId on the public governance path", () => {
		assert.equal(
			agencyChangeProposalsCollectionUrl(AGENCY_ID),
			`/v1/agencies/${AGENCY_ID}/change-proposals`,
		);
		assert.match(AGENCY_CHANGE_PROPOSALS_COLLECTION_PATH, /change-proposals/);
	});
});

describe("approvalsViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(
			approvalsViewFromResponse(401, { changeProposals: [realProposal] }),
			{ kind: "denied", status: 401 },
		);
	});

	it("maps 404/405 to empty collection_unavailable", () => {
		assert.deepEqual(approvalsViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty to no_pending", () => {
		assert.deepEqual(approvalsViewFromResponse(200, { changeProposals: [] }), {
			kind: "empty",
			reason: "no_pending",
			status: 200,
		});
	});

	it("maps 200 with DTOs to ready items", () => {
		const view = approvalsViewFromResponse(200, {
			changeProposals: [realProposal],
		});
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items.length, 1);
			assert.equal(view.items[0]?.kind, "INSTITUTIONAL");
		}
	});

	it("maps 200 with unknown JSON to stale", () => {
		assert.deepEqual(approvalsViewFromResponse(200, { count: 1 }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("approvalEmptyDescription", () => {
	it("cites the collection contract", () => {
		assert.match(
			approvalEmptyDescription("collection_unavailable"),
			/GET \/v1\/agencies\/:agencyId\/change-proposals/,
		);
		assert.ok(
			approvalEmptyDescription("no_pending").includes(APPROVALS_COLLECTION_CONTRACT),
		);
	});
});

describe("approvalDisplayLabel", () => {
	it("labels kind, status and required approvals", () => {
		assert.equal(
			approvalDisplayLabel(realProposal),
			"INSTITUTIONAL · pending · 1 aprovação(ões)",
		);
	});
});

describe("fetchAgencyChangeProposals", () => {
	it("returns collection_unavailable on live 404", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: { message: "not found" } }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchAgencyChangeProposals(AGENCY_ID, fetchFn);
		assert.deepEqual(view, {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});
});
