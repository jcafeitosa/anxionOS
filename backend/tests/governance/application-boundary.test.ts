import { describe, expect, test } from "bun:test";
import { collectApplicationLayerViolations } from "../boundary/application-layer-imports.test";
import { BACKEND_ROOT } from "../boundary/scan-imports";

describe("governance application boundary (AR01)", () => {
	test("governance application layer has no infrastructure or ORM imports", () => {
		const violations = collectApplicationLayerViolations(BACKEND_ROOT).filter(
			(item) => item.file.startsWith("modules/governance/"),
		);
		expect(violations).toEqual([]);
	});
});
