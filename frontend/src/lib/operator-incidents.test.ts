import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	agencyIncidentsCollectionUrl,
	fetchAgencyIncidents,
	incidentDisplayLabel,
	incidentEmptyDescription,
	incidentsViewFromResponse,
	INCIDENTS_COLLECTION_CONTRACT,
	OPERATIONS_INCIDENTS_COLLECTION_PATH,
} from "./operator-incidents.ts";

const AGENCY_ID = "11111111-1111-4111-8111-111111111111";
const INCIDENT_ID = "ops_inc_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const realIncident = {
	incidentId: INCIDENT_ID,
	organizationId: AGENCY_ID,
	title: "Venue reconciliation drift",
	description: "Paper venue desync detected",
	severity: "HIGH" as const,
	status: "OPEN" as const,
	serviceId: "execution-paper",
	openedAt: "2026-01-01T00:00:00.000Z",
	revision: 1,
	runbookId: null,
	runbookVersion: null,
	runbookAttachedAt: null,
	responsiblePrincipalId: null,
	resolvedAt: null,
	closedAt: null,
};

describe("agencyIncidentsCollectionUrl", () => {
	it("encodes the agencyId on the public operations path", () => {
		assert.equal(
			agencyIncidentsCollectionUrl(AGENCY_ID),
			`/v1/operations/agencies/${AGENCY_ID}/incidents`,
		);
		assert.match(OPERATIONS_INCIDENTS_COLLECTION_PATH, /incidents/);
	});
});

describe("incidentsViewFromResponse", () => {
	it("maps 401/403 to denied without inventing rows", () => {
		assert.deepEqual(
			incidentsViewFromResponse(401, { incidents: [realIncident] }),
			{ kind: "denied", status: 401 },
		);
	});

	it("maps 404/405 to empty collection_unavailable", () => {
		assert.deepEqual(incidentsViewFromResponse(404, { error: "not found" }), {
			kind: "empty",
			reason: "collection_unavailable",
			status: 404,
		});
	});

	it("maps 200 empty to no_incidents", () => {
		assert.deepEqual(incidentsViewFromResponse(200, { incidents: [] }), {
			kind: "empty",
			reason: "no_incidents",
			status: 200,
		});
	});

	it("maps 200 with incidents array to ready", () => {
		const view = incidentsViewFromResponse(200, { incidents: [realIncident] });
		assert.equal(view.kind, "ready");
		if (view.kind === "ready") {
			assert.equal(view.items[0]?.incidentId, INCIDENT_ID);
		}
	});

	it("maps malformed body to stale", () => {
		assert.deepEqual(incidentsViewFromResponse(200, { bad: true }), {
			kind: "stale",
			status: 200,
		});
	});
});

describe("fetchAgencyIncidents", () => {
	it("uses fetchFn and maps network failure to stale", async () => {
		const view = await fetchAgencyIncidents(AGENCY_ID, async () => {
			throw new Error("offline");
		});
		assert.deepEqual(view, { kind: "stale", status: null });
	});

	it("parses JSON collection on success", async () => {
		const view = await fetchAgencyIncidents(AGENCY_ID, async () =>
			new Response(JSON.stringify({ incidents: [realIncident] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			}),
		);
		assert.equal(view.kind, "ready");
	});
});

describe("incidentDisplayLabel", () => {
	it("includes severity, status and title", () => {
		assert.equal(
			incidentDisplayLabel(realIncident),
			"HIGH · OPEN · Venue reconciliation drift",
		);
	});
});

describe("incidentEmptyDescription", () => {
	it("references the collection contract", () => {
		assert.match(
			incidentEmptyDescription("no_incidents"),
			new RegExp(INCIDENTS_COLLECTION_CONTRACT.slice(0, 20)),
		);
	});
});
