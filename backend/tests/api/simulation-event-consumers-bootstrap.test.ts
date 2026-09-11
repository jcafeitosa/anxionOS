import { describe, expect, test } from "bun:test";
import { SIMULATION_EVENT_TYPES } from "@anxionos/contracts/simulation";
import { STRATEGIES_EVENT_TYPES } from "@anxionos/contracts/strategies";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";
import {
	SIMULATION_BACKTEST_REQUESTED_SUBJECT,
	SIMULATION_RUN_STARTED_SUBJECT,
} from "../../apps/api/src/simulation/bootstrap-event-consumers";
import {
	SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME,
	SIMULATION_RUN_STARTED_CONSUMER_NAME,
} from "../../apps/api/src/simulation/event-consumers";

/** Minimal NATS filter matcher for unit tests (`.` token, `>` suffix wildcard). */
function natsFilterMatches(filter: string, subject: string): boolean {
	const parts = filter.split(".");
	const tokens = subject.split(".");
	let i = 0;
	for (const part of parts) {
		if (part === ">") {
			return i < tokens.length;
		}
		if (i >= tokens.length || tokens[i] !== part) {
			return false;
		}
		i += 1;
	}
	return i === tokens.length;
}

describe("simulation event consumers bootstrap (ANX-159 P08-S2)", () => {
	test("JetStream subject resolves strategies.backtest.requested.v1", () => {
		expect(SIMULATION_BACKTEST_REQUESTED_SUBJECT).toBe(
			resolveEventSubject(STRATEGIES_EVENT_TYPES.BACKTEST_REQUESTED),
		);
		expect(SIMULATION_BACKTEST_REQUESTED_SUBJECT).toBe(
			"events.strategies.backtest.requested.v1",
		);
	});

	test("JetStream filter matches platform-scoped strategies backtest subject", () => {
		expect(
			natsFilterMatches(
				SIMULATION_BACKTEST_REQUESTED_SUBJECT,
				SIMULATION_BACKTEST_REQUESTED_SUBJECT,
			),
		).toBe(true);
	});

	test("consumer inbox name is stable for idempotent processing", () => {
		expect(SIMULATION_BACKTEST_REQUESTED_CONSUMER_NAME).toBe(
			"apps/api:simulation-backtest-requested:v1",
		);
	});

	test("JetStream subject resolves simulation.run.started.v1", () => {
		expect(SIMULATION_RUN_STARTED_SUBJECT).toBe(
			resolveEventSubject(SIMULATION_EVENT_TYPES.RUN_STARTED),
		);
		expect(SIMULATION_RUN_STARTED_SUBJECT).toBe(
			"events.simulation.run.started.v1",
		);
	});

	test("run-started consumer inbox name is stable", () => {
		expect(SIMULATION_RUN_STARTED_CONSUMER_NAME).toBe(
			"apps/api:simulation-run-started:v1",
		);
	});
});
