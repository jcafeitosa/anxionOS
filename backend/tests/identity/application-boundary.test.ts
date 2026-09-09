import { describe, expect, test } from "bun:test";
import { BACKEND_ROOT } from "../boundary/scan-imports";
import { collectApplicationLayerViolations } from "../boundary/application-layer-imports.test";

describe("identity application boundary", () => {
	test("identity application layer has no infrastructure or ORM imports", () => {
		const violations = collectApplicationLayerViolations(BACKEND_ROOT).filter((item) =>
			item.file.startsWith("modules/identity/"),
		);
		expect(violations).toEqual([]);
	});
});
