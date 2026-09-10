import { describe, expect, test } from "bun:test";
import { invertPostingLines } from "./invert-ledger-lines";

describe("invertPostingLines (ANX-152)", () => {
	test("swaps debit and credit preserving asset and amount", () => {
		const inverted = invertPostingLines([
			{
				id: "p1",
				journalEntryId: "e1",
				organizationId: "org",
				accountCode: "trading.cash",
				debit: "100.00",
				credit: "0",
				asset: "USD",
				amount: "100.00",
			},
		]);
		expect(inverted[0]).toEqual({
			accountCode: "trading.cash",
			debit: "0",
			credit: "100.00",
			asset: "USD",
			amount: "100.00",
		});
	});
});
