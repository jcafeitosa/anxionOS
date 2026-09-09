import type { LedgerLine } from "@anxionos/contracts/accounting";
import { throwAccountingError } from "./errors";

function parseAmount(value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throwAccountingError("ACC_UNBALANCED_ENTRY", "invalid amount in ledger line");
    }
    return parsed;
}
export function assertBalancedLines(lines: LedgerLine[]): void {
    if (lines.length < 2) {
        throwAccountingError("ACC_UNBALANCED_ENTRY", "ledger entry requires at least two lines");
    }
    const totalsByAsset = new Map();
    for (const line of lines) {
        const debit = parseAmount(line.debit);
        const credit = parseAmount(line.credit);
        const amount = parseAmount(line.amount);
        if (debit > 0 && credit > 0) {
            throwAccountingError("ACC_UNBALANCED_ENTRY", "line cannot have both debit and credit");
        }
        if (debit === 0 && credit === 0) {
            throwAccountingError("ACC_UNBALANCED_ENTRY", "line must have debit or credit");
        }
        const active = debit > 0 ? debit : credit;
        if (Math.abs(active - amount) > 0.00000001) {
            throwAccountingError("ACC_UNBALANCED_ENTRY", "amount must match debit or credit");
        }
        const bucket = totalsByAsset.get(line.asset) ?? { debit: 0, credit: 0 };
        bucket.debit += debit;
        bucket.credit += credit;
        totalsByAsset.set(line.asset, bucket);
    }
    for (const [asset, totals] of totalsByAsset) {
        if (Math.abs(totals.debit - totals.credit) > 0.00000001) {
            throwAccountingError("ACC_UNBALANCED_ENTRY", `unbalanced entry for asset ${asset}: debit ${totals.debit} credit ${totals.credit}`);
        }
    }
}
