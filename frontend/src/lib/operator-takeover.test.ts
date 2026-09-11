import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fetchOperatorTakeoverSnapshot,
	TAKEOVER_AUTONOMY_PATH,
	TAKEOVER_MUTATION_CONTRACT,
	TAKEOVER_READ_CONTRACT,
	takeoverAgentDisplayLabel,
	takeoverEmptyDescription,
} from "./operator-takeover.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const AGENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const realAgent = {
	id: AGENT_ID,
	organizationId: AGENCY_ID,
	kind: "AGENCY",
	displayName: "Execution desk",
	status: "ACTIVE",
	activeVersionId: null,
	revision: 1,
};

const activeAssignment = {
	id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	scopeId: AGENCY_ID,
	subjectAgentId: AGENT_ID,
	level: "L2" as const,
	status: "active",
	authorityEpochAtAssignment: 1,
	revision: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("TAKEOVER_READ_CONTRACT", () => {
	it("documents agents collection and per-agent autonomy GET", () => {
		assert.match(TAKEOVER_READ_CONTRACT, /GET \/v1\/agencies\/:agencyId\/agents/);
		assert.match(TAKEOVER_AUTONOMY_PATH, /autonomy/);
	});
});

describe("TAKEOVER_MUTATION_CONTRACT", () => {
	it("documents POST transitionKind takeover with Idempotency-Key", () => {
		assert.match(
			TAKEOVER_MUTATION_CONTRACT,
			/POST \/v1\/agencies\/:agencyId\/agents\/:agentId\/autonomy\/transition/,
		);
		assert.match(TAKEOVER_MUTATION_CONTRACT, /transitionKind: takeover/);
		assert.match(TAKEOVER_MUTATION_CONTRACT, /Idempotency-Key/);
	});
});

describe("takeoverEmptyDescription", () => {
	it("references the read contract for both empty reasons", () => {
		assert.ok(takeoverEmptyDescription("no_agents").includes(TAKEOVER_READ_CONTRACT));
		assert.ok(takeoverEmptyDescription("collection_unavailable").includes(TAKEOVER_READ_CONTRACT));
	});
});

describe("takeoverAgentDisplayLabel", () => {
	it("includes display name, kind and status", () => {
		assert.equal(
			takeoverAgentDisplayLabel(realAgent),
			"Execution desk · AGENCY · ACTIVE",
		);
	});
});

describe("fetchOperatorTakeoverSnapshot", () => {
	it("propagates denied catalog without inventing agents", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: "forbidden" }), {
				status: 403,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchOperatorTakeoverSnapshot(AGENCY_ID, fetchFn);
		assert.deepEqual(view, { kind: "denied", status: 403 });
	});

	it("maps empty collection_unavailable honestly", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ error: "not found" }), {
				status: 404,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchOperatorTakeoverSnapshot(AGENCY_ID, fetchFn);
		assert.deepEqual(view, {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("fetches autonomy per agent when catalog is ready", async () => {
		const fetchFn: typeof fetch = async (input) => {
			const url = String(input);
			if (url.endsWith("/agents")) {
				return new Response(JSON.stringify({ agents: [realAgent] }), {
					status: 200,
					headers: { "content-type": "application/json" },
				});
			}
			if (url.includes(AGENT_ID)) {
				return new Response(
					JSON.stringify({ level: "L2", assignment: activeAssignment }),
					{ status: 200, headers: { "content-type": "application/json" } },
				);
			}
			return new Response(JSON.stringify({ level: null, assignment: null }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};
		const view = await fetchOperatorTakeoverSnapshot(AGENCY_ID, fetchFn);
		assert.equal(view.kind, "loaded");
		if (view.kind === "loaded") {
			assert.equal(view.agents.length, 1);
			assert.equal(view.autonomyByAgent[AGENT_ID]?.kind, "ready");
			if (view.autonomyByAgent[AGENT_ID]?.kind === "ready") {
				assert.equal(view.autonomyByAgent[AGENT_ID].level, "L2");
			}
		}
	});

	it("returns stale when catalog fetch throws", async () => {
		const fetchFn: typeof fetch = async () => {
			throw new TypeError("network");
		};
		const view = await fetchOperatorTakeoverSnapshot(AGENCY_ID, fetchFn);
		assert.deepEqual(view, { kind: "stale", status: null });
	});

	it("maps ready catalog with empty agents list to no_agents", async () => {
		const fetchFn: typeof fetch = async () =>
			new Response(JSON.stringify({ agents: [] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		const view = await fetchOperatorTakeoverSnapshot(AGENCY_ID, fetchFn);
		assert.deepEqual(view, {
			kind: "empty",
			reason: "no_agents",
			status: 200,
		});
	});
});
