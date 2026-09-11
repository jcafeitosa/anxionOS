import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AGENT_AUTONOMY_PATH,
	agentAutonomyUrl,
	autonomyDisplayLabel,
	autonomyViewFromResponse,
	AUTONOMY_PER_AGENT_CONTRACT,
	fetchAgentAutonomy,
	fetchAgentsAutonomy,
} from "./owner-agent-autonomy.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENT_ID_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const activeAssignment = {
	id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	scopeId: AGENCY_ID,
	subjectAgentId: AGENT_ID,
	level: "L1" as const,
	status: "active",
	authorityEpochAtAssignment: 1,
	revision: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("agentAutonomyUrl", () => {
	it("encodes agencyId and agentId on the governance autonomy path", () => {
		assert.equal(
			agentAutonomyUrl(AGENCY_ID, AGENT_ID),
			`/v1/agencies/${AGENCY_ID}/agents/${AGENT_ID}/autonomy`,
		);
		assert.match(AGENT_AUTONOMY_PATH, /autonomy/);
	});
});

describe("autonomyViewFromResponse", () => {
	it("maps 401/403 to denied without inventing levels", () => {
		assert.deepEqual(
			autonomyViewFromResponse(401, { level: "L2", assignment: activeAssignment }),
			{ kind: "denied", status: 401 },
		);
		assert.deepEqual(autonomyViewFromResponse(403, null), {
			kind: "denied",
			status: 403,
		});
	});

	it("maps 200 with null level to unassigned (no fake L0)", () => {
		assert.deepEqual(autonomyViewFromResponse(200, { level: null, assignment: null }), {
			kind: "unassigned",
		});
	});

	it("maps 200 with level from API to ready", () => {
		const view = autonomyViewFromResponse(200, {
			level: "L1",
			assignment: activeAssignment,
		});
		assert.deepEqual(view, {
			kind: "ready",
			level: "L1",
			assignmentStatus: "active",
			assignmentRevision: 1,
		});
	});

	it("maps 200 with unknown JSON to stale instead of fake levels", () => {
		assert.deepEqual(autonomyViewFromResponse(200, { autonomy: "L2" }), {
			kind: "stale",
			status: 200,
		});
	});

	it("maps 500 to stale", () => {
		assert.deepEqual(autonomyViewFromResponse(500, null), {
			kind: "stale",
			status: 500,
		});
	});
});

describe("autonomyDisplayLabel", () => {
	it("shows API level and status when ready", () => {
		assert.equal(
			autonomyDisplayLabel({
				kind: "ready",
				level: "L1",
				assignmentStatus: "active",
				assignmentRevision: 1,
			}),
			"L1 · active",
		);
	});

	it("shows honest unassigned without inventing L0", () => {
		assert.equal(autonomyDisplayLabel({ kind: "unassigned" }), "sem nível atribuído");
	});

	it("cites denied HTTP status", () => {
		assert.match(autonomyDisplayLabel({ kind: "denied", status: 403 }), /403/);
	});
});

describe("AUTONOMY_PER_AGENT_CONTRACT", () => {
	it("documents the per-agent GET path", () => {
		assert.match(
			AUTONOMY_PER_AGENT_CONTRACT,
			/GET \/v1\/agencies\/:agencyId\/agents\/:agentId\/autonomy/,
		);
	});
});

describe("fetchAgentAutonomy", () => {
	it("returns unassigned on live 200 with null level", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ level: null, assignment: null }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchAgentAutonomy(AGENCY_ID, AGENT_ID, fetchFn);
		assert.deepEqual(view, { kind: "unassigned" });
	});

	it("returns stale when fetch throws", async () => {
		const fetchFn: typeof fetch = async () => {
			throw new TypeError("network");
		};
		const view = await fetchAgentAutonomy(AGENCY_ID, AGENT_ID, fetchFn);
		assert.deepEqual(view, { kind: "stale", status: null });
	});
});

describe("fetchAgentsAutonomy", () => {
	it("fetches autonomy per agent id without inventing defaults", async () => {
		const fetchFn: typeof fetch = async (input) => {
			const url = String(input);
			if (url.includes(AGENT_ID)) {
				return new Response(
					JSON.stringify({ level: "L2", assignment: { ...activeAssignment, level: "L2" } }),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ level: null, assignment: null }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};
		const map = await fetchAgentsAutonomy(AGENCY_ID, [AGENT_ID, AGENT_ID_2], fetchFn);
		assert.equal(map[AGENT_ID]?.kind, "ready");
		if (map[AGENT_ID]?.kind === "ready") {
			assert.equal(map[AGENT_ID].level, "L2");
		}
		assert.deepEqual(map[AGENT_ID_2], { kind: "unassigned" });
	});
});
