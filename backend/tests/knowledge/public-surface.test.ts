import { describe, expect, test } from "bun:test";
import * as knowledge from "@anxionos/knowledge";

describe("knowledge public surface", () => {
	test("exposes the PostgreSQL memory adapter but not the in-memory fixture", () => {
		expect("createPgMemoryStore" in knowledge).toBe(true);
		expect("createInMemoryMemoryStore" in knowledge).toBe(false);
		expect("knowledgeMemories" in knowledge).toBe(true);
	});
});
