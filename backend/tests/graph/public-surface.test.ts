import { describe, expect, test } from "bun:test";
import * as graph from "@anxionos/graph";

	describe("graph public surface", () => {
	test("does not expose test-only traversal evaluators", () => {
		expect("createMockTraversalEvaluator" in graph).toBe(false);
	});
});
