import { describe, expect, test } from "bun:test";
import { getIncident, listIncidents } from "@anxionos/operations";
import { createInMemoryIncidentRepository } from "./test-support";

const organizationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const sampleIncident = {
	id: "ops_inc_11111111-1111-4111-8111-111111111111",
	organizationId,
	title: "Ledger lag spike",
	description: "Replication delay exceeded SLO",
	severity: "HIGH",
	status: "OPEN",
	serviceId: "ledger-writer",
	openedAt: "2026-09-11T12:00:00.000Z",
	revision: 1,
	runbookId: null,
	runbookVersion: null,
	runbookAttachedAt: null,
	responsiblePrincipalId: null,
	resolvedAt: null,
	closedAt: null,
};

describe("incident queries (ANX-158 S2 HTTP)", () => {
	test("getIncident returns snapshot for agency-scoped incident", async () => {
		const incidents = createInMemoryIncidentRepository([sampleIncident]);
		const snapshot = await getIncident(
			{ incidents },
			organizationId,
			sampleIncident.id,
		);
		expect(snapshot.incidentId).toBe(sampleIncident.id);
		expect(snapshot.title).toBe(sampleIncident.title);
		expect(snapshot.severity).toBe("HIGH");
	});

	test("getIncident rejects cross-tenant lookup", async () => {
		const incidents = createInMemoryIncidentRepository([sampleIncident]);
		await expect(
			getIncident(
				{ incidents },
				"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
				sampleIncident.id,
			),
		).rejects.toMatchObject({ code: "OPS_INCIDENT_NOT_FOUND" });
	});

	test("listIncidents returns agency incidents newest first", async () => {
		const older = {
			...sampleIncident,
			id: "ops_inc_22222222-2222-4222-8222-222222222222",
			openedAt: "2026-09-10T12:00:00.000Z",
			title: "Older incident",
		};
		const incidents = createInMemoryIncidentRepository([older, sampleIncident]);
		const result = await listIncidents({ incidents }, organizationId);
		expect(result.incidents).toHaveLength(2);
		expect(result.incidents[0]?.incidentId).toBe(sampleIncident.id);
		expect(result.incidents[1]?.incidentId).toBe(older.id);
	});
});
