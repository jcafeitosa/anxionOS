import { describe, expect, test } from "bun:test";
import * as agents from "@anxionos/agents";

describe("agents public surface", () => {
	test("does not expose an in-memory run fence as a production adapter", () => {
		expect("createInMemoryOrchestrationRunFenceAdapter" in agents).toBe(false);
	});
});
