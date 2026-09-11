import { describe, expect, test } from "bun:test";
import { ACCOUNTING_EVENT_TYPES } from "@anxionos/contracts/accounting";
import { PORTFOLIOS_EVENT_TYPES } from "@anxionos/contracts/portfolios";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";
import {
	PERFORMANCE_LEDGER_POSTED_SUBJECT,
	PERFORMANCE_POSITION_UPDATED_SUBJECT,
} from "../../apps/api/src/performance/bootstrap-event-consumers";
import {
	PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME,
	PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME,
} from "../../apps/api/src/performance/event-consumers";

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

describe("performance event consumers bootstrap", () => {
	test("JetStream subjects resolve platform event types for performance consumers", () => {
		expect(PERFORMANCE_LEDGER_POSTED_SUBJECT).toBe(
			resolveEventSubject(ACCOUNTING_EVENT_TYPES.LEDGER_POSTED),
		);
		expect(PERFORMANCE_POSITION_UPDATED_SUBJECT).toBe(
			resolveEventSubject(PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED),
		);
		expect(PERFORMANCE_LEDGER_POSTED_SUBJECT).toBe(
			"events.accounting.ledger.posted.v1",
		);
		expect(PERFORMANCE_POSITION_UPDATED_SUBJECT).toBe(
			"events.portfolios.position.updated.v1",
		);
	});

	test("JetStream filters match platform-scoped accounting and portfolios subjects", () => {
		expect(
			natsFilterMatches(
				PERFORMANCE_LEDGER_POSTED_SUBJECT,
				PERFORMANCE_LEDGER_POSTED_SUBJECT,
			),
		).toBe(true);
		expect(
			natsFilterMatches(
				PERFORMANCE_POSITION_UPDATED_SUBJECT,
				PERFORMANCE_POSITION_UPDATED_SUBJECT,
			),
		).toBe(true);
	});

	test("consumer inbox names are stable for idempotent processing", () => {
		expect(PERFORMANCE_LEDGER_POSTED_CONSUMER_NAME).toBe(
			"apps/api:performance-ledger-posted:v1",
		);
		expect(PERFORMANCE_POSITION_UPDATED_CONSUMER_NAME).toBe(
			"apps/api:performance-position-updated:v1",
		);
	});
});
