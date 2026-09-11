import { describe, expect, test } from "bun:test";
import * as riskModule from "@anxionos/risk";
import { checkResultSchema } from "@anxionos/contracts/risk";

describe("risk post-trade defer (ANX-150 S4 / D-RK-010)", () => {
	test("NOT_APPLICABLE: runPostTradeCheck and buildExposureSnapshot deferred per R09 P06-S4", () => {
		expect("runPostTradeCheck" in riskModule).toBe(false);
		expect("buildExposureSnapshot" in riskModule).toBe(false);
		expect(checkResultSchema.safeParse("DEFER").success).toBe(true);
	});
});
