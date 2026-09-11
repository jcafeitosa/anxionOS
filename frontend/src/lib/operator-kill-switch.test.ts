import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agencyKillSwitchStatusUrl,
	fetchAgencyKillSwitchStatus,
	killSwitchDisplayLabel,
	killSwitchEmptyDescription,
	killSwitchMutationsAvailable,
	killSwitchViewFromResponse,
	KILL_SWITCH_READ_CONTRACT,
	RISK_KILL_SWITCH_STATUS_PATH,
} from "./operator-kill-switch.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const KILL_SWITCH_ID = "rk_ksw_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const inactiveStatus = {
	organizationId: AGENCY_ID,
	scope: "ORGANIZATION" as const,
	killSwitchActive: false,
	riskEpoch: 3,
};

const activeStatus = {
	killSwitchId: KILL_SWITCH_ID,
	organizationId: AGENCY_ID,
	scope: "ORGANIZATION" as const,
	killSwitchActive: true,
	reason: "Incident response drill",
	activatedBy: "principal-001",
	activatedAt: "2026-01-01T00:00:00.000Z",
	riskEpoch: 4,
};

describe("agencyKillSwitchStatusUrl", () => {
	it("encodes the agencyId on the public risk path", () => {
		assert.equal(
			agencyKillSwitchStatusUrl(AGENCY_ID),
			`/v1/risk/agencies/${AGENCY_ID}/kill-switch`,
		);
		assert.match(RISK_KILL_SWITCH_STATUS_PATH, /kill-switch/);
	});
});

describe("killSwitchViewFromResponse", () => {
	it("maps 401/403 to denied without inventing status", () => {
		assert.deepEqual(
			killSwitchViewFromResponse(401, { killSwitchActive: true }),
			{ kind: "denied", status: 401 },
		);
	});

	it("maps 404/405 to empty collection_unavailable", () => {
		assert.deepEqual(killSwitchViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 inactive status to ready", () => {
		const view = killSwitchViewFromResponse(200, inactiveStatus);
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.status.killSwitchActive, false);
		}
	});

	it("maps 200 wrapped status to ready", () => {
		const view = killSwitchViewFromResponse(200, { status: activeStatus });
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.status.killSwitchId, KILL_SWITCH_ID);
		}
	});

	it("maps malformed body to stale", () => {
		assert.deepEqual(killSwitchViewFromResponse(200, { bad: true }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("fetchAgencyKillSwitchStatus", () => {
	it("uses fetchFn and maps network failure to stale", async () => {
		const view = await fetchAgencyKillSwitchStatus(AGENCY_ID, async () => {
			throw new Error("offline");
		});
		assert.deepEqual(view, { kind: "stale", status: null });
	});

	it("parses JSON status on success", async () => {
		const view = await fetchAgencyKillSwitchStatus(AGENCY_ID, async () =>
			new Response(JSON.stringify(inactiveStatus), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		assert.equal(view.kind, "ready");
	});
});

describe("killSwitchDisplayLabel", () => {
	it("shows inactive and active labels honestly", () => {
		assert.equal(killSwitchDisplayLabel(inactiveStatus), "Inativo · ORGANIZATION");
		assert.match(
			killSwitchDisplayLabel(activeStatus),
			/ATIVO · ORGANIZATION · Incident response drill/,
		);
	});
});

describe("killSwitchMutationsAvailable", () => {
	it("is false when collection_unavailable", () => {
		assert.equal(
			killSwitchMutationsAvailable({
				kind: "empty",
				reason: "collection_unavailable",
				status: 404,
			}),
			false,
		);
	});

	it("is true when status is ready", () => {
		assert.equal(
			killSwitchMutationsAvailable({ kind: "ready", status: inactiveStatus }),
			true,
		);
	});
});

describe("killSwitchEmptyDescription", () => {
	it("references the read contract", () => {
		assert.match(
			killSwitchEmptyDescription("collection_unavailable"),
			new RegExp(KILL_SWITCH_READ_CONTRACT.slice(0, 20)),
		);
	});
});
