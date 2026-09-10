import { describe, expect, test } from "bun:test";
import { canTransitionRunStatus, isTerminalRunStatus } from "./run";

describe("run status transitions (WAITING_HUMAN_INPUT)", () => {
	test("ACTIVE can enter WAITING_HUMAN_INPUT", () => {
		expect(canTransitionRunStatus("ACTIVE", "WAITING_HUMAN_INPUT")).toBe(true);
	});

	test("PAUSED can enter WAITING_HUMAN_INPUT", () => {
		expect(canTransitionRunStatus("PAUSED", "WAITING_HUMAN_INPUT")).toBe(true);
	});

	test("WAITING_HUMAN_INPUT can resume to ACTIVE", () => {
		expect(canTransitionRunStatus("WAITING_HUMAN_INPUT", "ACTIVE")).toBe(true);
	});

	test("WAITING_HUMAN_INPUT can terminate or orphan", () => {
		expect(canTransitionRunStatus("WAITING_HUMAN_INPUT", "TERMINATED")).toBe(
			true,
		);
		expect(canTransitionRunStatus("WAITING_HUMAN_INPUT", "ORPHANED")).toBe(
			true,
		);
	});

	test("WAITING_HUMAN_INPUT is not terminal", () => {
		expect(isTerminalRunStatus("WAITING_HUMAN_INPUT")).toBe(false);
	});

	test("SCHEDULED cannot jump to WAITING_HUMAN_INPUT", () => {
		expect(canTransitionRunStatus("SCHEDULED", "WAITING_HUMAN_INPUT")).toBe(
			false,
		);
	});

	test("COMPLETED cannot enter WAITING_HUMAN_INPUT", () => {
		expect(canTransitionRunStatus("COMPLETED", "WAITING_HUMAN_INPUT")).toBe(
			false,
		);
	});
});

describe("run status transitions (ORPHANED restart)", () => {
	test("ORPHANED can enter WAKING", () => {
		expect(canTransitionRunStatus("ORPHANED", "WAKING")).toBe(true);
	});

	test("WAKING can become ACTIVE", () => {
		expect(canTransitionRunStatus("WAKING", "ACTIVE")).toBe(true);
	});
});
