import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { assertBalancedLines } from "../balance-validation";
import { buildTradeFillLines } from "./post-trade-fill";

describe("buildTradeFillLines (ANX-152)", () => {
	const base = {
		commandId: randomUUID(),
		organizationId: randomUUID(),
		fillId: "fill-1",
		orderId: randomUUID(),
		side: "BUY" as const,
		asset: "EUR",
		notionalAmount: "1000.00",
		executionMode: "SIMULATED" as const,
		idempotencyKey: "idem-1",
	};

	test("includes fee lines in separate settlement asset", () => {
		const lines = buildTradeFillLines({
			...base,
			feeAmount: "2.50",
			feeAsset: "USD",
		});
		expect(lines).toHaveLength(4);
		assertBalancedLines(lines);
		const usdLines = lines.filter((line) => line.asset === "USD");
		const eurLines = lines.filter((line) => line.asset === "EUR");
		expect(usdLines).toHaveLength(2);
		expect(eurLines).toHaveLength(2);
	});
});
