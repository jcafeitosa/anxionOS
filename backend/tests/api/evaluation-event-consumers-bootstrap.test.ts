import { describe, expect, test } from "bun:test";
import { PERFORMANCE_EVENT_TYPES } from "@anxionos/contracts/performance";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";
import { EVALUATION_OUTCOME_RECORDED_SUBJECT } from "../../apps/api/src/evaluation/bootstrap-event-consumers";
import { EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME } from "../../apps/api/src/evaluation/event-consumers";

describe("evaluation event consumers bootstrap (ANX-160 S4)", () => {
	test("JetStream subject resolves performance.outcome.recorded.v1", () => {
		expect(EVALUATION_OUTCOME_RECORDED_SUBJECT).toBe(
			resolveEventSubject(PERFORMANCE_EVENT_TYPES.OUTCOME_RECORDED),
		);
		expect(EVALUATION_OUTCOME_RECORDED_SUBJECT).toBe(
			"events.performance.outcome.recorded.v1",
		);
	});

	test("consumer inbox name is stable for idempotent processing", () => {
		expect(EVALUATION_OUTCOME_RECORDED_CONSUMER_NAME).toBe(
			"apps/api:evaluation-outcome-recorded:v1",
		);
	});
});
