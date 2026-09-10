import { describe, expect, test } from "bun:test";
import {
	canTransitionIncidentStatus,
	isTerminalIncidentStatus,
	requiresRunbookForStatus,
} from "@anxionos/operations";

describe("incident lifecycle domain (ANX-311 S2)", () => {
	test("canTransitionIncidentStatus allows triage and escalation paths", () => {
		expect(canTransitionIncidentStatus("OPEN", "ACKNOWLEDGED")).toBe(true);
		expect(canTransitionIncidentStatus("ACKNOWLEDGED", "INVESTIGATING")).toBe(
			true,
		);
		expect(canTransitionIncidentStatus("INVESTIGATING", "ESCALATED")).toBe(
			true,
		);
	});

	test("MITIGATING requires attached runbook", () => {
		expect(
			canTransitionIncidentStatus("INVESTIGATING", "MITIGATING", {
				hasRunbookAttached: false,
			}),
		).toBe(false);
		expect(
			canTransitionIncidentStatus("INVESTIGATING", "MITIGATING", {
				hasRunbookAttached: true,
			}),
		).toBe(true);
	});

	test("terminal and runbook requirements", () => {
		expect(isTerminalIncidentStatus("CLOSED")).toBe(true);
		expect(isTerminalIncidentStatus("RESOLVED")).toBe(false);
		expect(requiresRunbookForStatus("MITIGATING")).toBe(true);
		expect(requiresRunbookForStatus("RESOLVED")).toBe(false);
	});

	test("rejects invalid transitions", () => {
		expect(canTransitionIncidentStatus("CLOSED", "OPEN")).toBe(false);
		expect(canTransitionIncidentStatus("RESOLVED", "INVESTIGATING")).toBe(false);
	});
});
