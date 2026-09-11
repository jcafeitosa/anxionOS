import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type {
	AccountingTransactionContext,
	AccountingUnitOfWork,
	JournalEntryRecord,
	LedgerPostingRecord,
} from "../../domain/ports/accounting-unit-of-work";
import { AccountingCommandError } from "../errors";
import { reverseLedgerEntry } from "./reverse-ledger-entry";

const ORG = "00000000-0000-4000-8000-000000000001";
const ENTRY_ID = `acc_je_${randomUUID()}`;

function createDeps(
	original: JournalEntryRecord,
	postings: LedgerPostingRecord[],
) {
	const entries = new Map<string, JournalEntryRecord>([
		[original.id, original],
	]);
	const postingStore = [...postings];
	const journal = new Map<
		string,
		{ organizationId: string; responseSnapshot: Record<string, unknown> }
	>();
	const ctx: AccountingTransactionContext = {
		commandJournal: {
			async findByCommandId(id) {
				const entry = journal.get(id);
				return entry
					? {
							commandId: id,
							organizationId: entry.organizationId,
							commandName: "reverseLedgerEntry",
							responseSnapshot: entry.responseSnapshot,
						}
					: null;
			},
			async save(entry) {
				journal.set(entry.commandId, {
					organizationId: entry.organizationId,
					responseSnapshot: entry.responseSnapshot,
				});
			},
		},
		chartAccounts: {
			async findByCode(_org, code) {
				return {
					id: `chart_${code}`,
					organizationId: ORG,
					code,
					kind: "ASSET",
					currency: "USD",
					status: "ACTIVE",
				};
			},
			async ensureDefaultChart() {},
		},
		journalEntries: {
			async findById(id) {
				return entries.get(id) ?? null;
			},
			async findByIdempotencyKey(org, key) {
				for (const entry of entries.values()) {
					if (entry.organizationId === org && entry.idempotencyKey === key) {
						return entry;
					}
				}
				return null;
			},
			async save(record) {
				entries.set(record.id, record);
				return record;
			},
			async updateStatus(id, status, revision) {
				const entry = entries.get(id);
				if (!entry) throw new Error("missing");
				const updated = { ...entry, status, revision };
				entries.set(id, updated);
				return updated;
			},
		},
		ledgerPostings: {
			async save(record) {
				postingStore.push(record);
				return record;
			},
			async findByEntryId(journalEntryId) {
				return postingStore.filter((p) => p.journalEntryId === journalEntryId);
			},
		},
		async publishEvents() {},
	};
	const unitOfWork: AccountingUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		unitOfWork,
		commandJournal: ctx.commandJournal,
		entries,
		postingStore,
	};
}

const originalEntry: JournalEntryRecord = {
	id: ENTRY_ID,
	organizationId: ORG,
	entryKind: "TRADE_FILL",
	status: "POSTED",
	idempotencyKey: "fill:1",
	sourceRef: null,
	valueDate: "2026-09-10",
	executionMode: "SIMULATED",
	capitalAccountId: null,
	portfolioId: null,
	revision: 1,
};

const originalPostings: LedgerPostingRecord[] = [
	{
		id: "p1",
		journalEntryId: ENTRY_ID,
		organizationId: ORG,
		accountCode: "trading.cash",
		debit: "100.00",
		credit: "0",
		asset: "USD",
		amount: "100.00",
	},
	{
		id: "p2",
		journalEntryId: ENTRY_ID,
		organizationId: ORG,
		accountCode: "trading.clearing",
		debit: "0",
		credit: "100.00",
		asset: "USD",
		amount: "100.00",
	},
];

describe("reverseLedgerEntry (ANX-152)", () => {
	test("creates reversal entry and marks original REVERSED", async () => {
		const { unitOfWork, commandJournal, entries } = createDeps(
			originalEntry,
			originalPostings,
		);
		const result = await reverseLedgerEntry(
			{ unitOfWork, commandJournal },
			{
				commandId: randomUUID(),
				organizationId: ORG,
				entryId: ENTRY_ID,
				idempotencyKey: "rev:1",
				executionMode: "SIMULATED",
				reason: "correction",
			},
		);
		expect(result.entryId).not.toBe(ENTRY_ID);
		expect(entries.get(ENTRY_ID)?.status).toBe("REVERSED");
		expect(entries.get(result.entryId ?? "")?.entryKind).toBe("REVERSAL");
	});

	test("rejects reversing already reversed entry", async () => {
		const reversed = { ...originalEntry, status: "REVERSED" };
		const { unitOfWork, commandJournal } = createDeps(
			reversed,
			originalPostings,
		);
		await expect(
			reverseLedgerEntry(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: ORG,
					entryId: ENTRY_ID,
					idempotencyKey: "rev:2",
					executionMode: "SIMULATED",
				},
			),
		).rejects.toBeInstanceOf(AccountingCommandError);
	});
});
