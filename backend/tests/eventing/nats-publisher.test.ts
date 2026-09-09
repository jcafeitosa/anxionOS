import { describe, expect, test } from "bun:test";
import { resolveEventSubject } from "@anxionos/eventing/nats-publisher";

describe("nats publisher helpers", () => {
	test("resolveEventSubject prefixes events namespace", () => {
		expect(resolveEventSubject("identity.principal.suspended.v1")).toBe(
			"events.identity.principal.suspended.v1",
		);
	});
});
