import { describe, expect, test } from "bun:test";
import {
	computerSessionRefSchema,
	sandboxToolCatalogSchema,
	toolAuditEntrySchema,
} from "@anxionos/contracts/openbot";
import catalogFixture from "./fixtures/sandbox-tool-catalog.json";
import sessionFixture from "./fixtures/sandbox-computer-session.json";
import auditFixture from "./fixtures/sandbox-audit-trail.json";

describe("openbot sandbox fixtures (ANX-144 S1 / R144-06)", () => {
	test("sandbox-tool-catalog.json validates and has no credential fields", () => {
		const parsed = sandboxToolCatalogSchema.parse(catalogFixture);
		expect(parsed.catalogId).toBe("anxionos-sandbox-tools-v1");
		expect(parsed.entries.every((entry) => entry.sandboxOnly)).toBe(true);
		const serialized = JSON.stringify(parsed).toLowerCase();
		expect(serialized).not.toContain("api_key");
		expect(serialized).not.toContain("password");
	});

	test("sandbox-computer-session.json validates workspace jail path", () => {
		const parsed = computerSessionRefSchema.parse(sessionFixture);
		expect(parsed.workspacePath.startsWith("/tmp/anxionos-openbot-sandbox/")).toBe(
			true,
		);
	});

	test("sandbox-audit-trail.json entries validate before/after phases", () => {
		for (const entry of auditFixture.entries) {
			const parsed = toolAuditEntrySchema.parse(entry);
			expect(["before", "after"]).toContain(parsed.phase);
		}
	});
});
