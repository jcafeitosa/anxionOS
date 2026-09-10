import { describe, expect, test } from "bun:test";
import { collectApplicationLayerViolations } from "../boundary/application-layer-imports.test";
import { BACKEND_ROOT } from "../boundary/scan-imports";

describe("organizations application boundary", () => {
	test("organizations application layer has no infrastructure or ORM imports", () => {
		const violations = collectApplicationLayerViolations(BACKEND_ROOT).filter(
			(item) => item.file.startsWith("modules/organizations/"),
		);
		expect(violations).toEqual([]);
	});
});
