import type { LedgerLine } from "@anxionos/contracts/accounting";
import type { LedgerPostingRecord } from "../domain/ports/accounting-unit-of-work";

export function invertPostingLines(
	postings: LedgerPostingRecord[],
): LedgerLine[] {
	return postings.map((posting) => ({
		accountCode: posting.accountCode,
		debit: posting.credit,
		credit: posting.debit,
		asset: posting.asset,
		amount: posting.amount,
	}));
}
