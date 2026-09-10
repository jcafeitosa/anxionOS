import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type {
	JournalEntryRecord,
	LedgerPostingRecord,
} from "../../modules/accounting/src/domain/ports/accounting-unit-of-work";
import type { CommandJournalEntry } from "../../modules/accounting/src/domain/ports/command-journal";
import { reverseLedgerEntry } from "../../modules/accounting/src/application/commands/reverse-ledger-entry";
import { AccountingCommandError } from "../../modules/accounting/src/application/errors";

const orgId = "11111111-1111-4111-8111-111111111111";
const entryId = "acc_je_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

function createHarness(initial?: {
	entry?: JournalEntryRecord;
	postings?: LedgerPostingRecord[];
}) {
	const commandJournal = new Map<string, CommandJournalEntry>();
	const entries = new Map<string, JournalEntryRecord>();
	const postings = new Map<string, LedgerPostingRecord[]>();
	const events: unknown[] = [];

	if (initial?.entry) entries.set(initial.entry.id, initial.entry);
	if (initial?.postings) postings.set(entryId, initial.postings);

	const unitOfWork = {
		async runInTransaction<T>(work: (ctx: any) => Promise<T>) {
			const ctx = {
				commandJournal: {
					async findByCommandId(commandId: string) {
						return commandJournal.get(commandId) ?? null;
					},
					async save(record: CommandJournalEntry) {
						commandJournal.set(record.commandId, record);
					},
				},
				journalEntries: {
					async findById(id: string) {
						return entries.get(id) ?? null;
					},
					async findByIdempotencyKey(organizationId: string, key: string) {
						for (const entry of entries.values()) {
							if (
								entry.organizationId === organizationId &&
								entry.idempotencyKey === key
							) {
								return entry;
							}
						}
						return null;
					},
					async save(record: JournalEntryRecord) {
						entries.set(record.id, record);
						return record;
					},
					async updateStatus(id: string, status: string, revision: number) {
						const current = entries.get(id);
						if (!current) throw new Error("missing");
						const updated = { ...current, status, revision };
						entries.set(id, updated);
						return updated;
					},
				},
				ledgerPostings: {
					async findByEntryId(journalEntryId: string) {
						return postings.get(journalEntryId) ?? [];
					},
					async save(record: LedgerPostingRecord) {
						const list = postings.get(record.journalEntryId) ?? [];
						list.push(record);
						postings.set(record.journalEntryId, list);
						return record;
					},
				},
				async publishEvents(envelopes: unknown[]) {
					events.push(...envelopes);
				},
			};
			return work(ctx);
		},
	};

	return { unitOfWork, commandJournal, entries, postings, events };
}

const baseEntry: JournalEntryRecord = {
	id: entryId,
	organizationId: orgId,
	entryKind: "MANUAL",
	status: "POSTED",
	idempotencyKey: "manual-1",
	sourceRef: null,
	valueDate: "2026-09-10",
	executionMode: "SIMULATED",
	capitalAccountId: null,
	portfolioId: null,
	revision: 1,
};

const basePostings: LedgerPostingRecord[] = [
	{
		id: "acc_post_11111111-1111-4111-8111-111111111111",
		journalEntryId: entryId,
		organizationId: orgId,
		accountCode: "trading.cash",
		debit: "100.00",
		credit: "0",
		asset: "USD",
		amount: "100.00",
	},
	{
		id: "acc_post_22222222-2222-4222-8222-222222222222",
		journalEntryId: entryId,
		organizationId: orgId,
		accountCode: "trading.clearing",
		debit: "0",
		credit: "100.00",
		asset: "USD",
		amount: "100.00",
	},
];

describe("reverseLedgerEntry", () => {
	test("creates reversal entry and marks original reversed", async () => {
		const harness = createHarness({
			entry: baseEntry,
			postings: basePostings,
		});
		const result = await reverseLedgerEntry(
			{
				unitOfWork: harness.unitOfWork,
				commandJournal: {
					findByCommandId: async () => null,
					save: async () => {},
				},
			},
			{
				commandId: randomUUID(),
				organizationId: orgId,
				entryId,
				idempotencyKey: "reverse-request-1",
				executionMode: "SIMULATED",
				reason: "correction",
			},
		);

		expect(result.entryId).toMatch(/^acc_je_/);
		expect(harness.entries.get(entryId)?.status).toBe("REVERSED");
		const reversalPostings = harness.postings.get(result.entryId!) ?? [];
		expect(reversalPostings[0]?.debit).toBe("0");
		expect(reversalPostings[0]?.credit).toBe("100.00");
		expect(harness.events).toHaveLength(2);
	});

	test("rejects reversing already reversed entry", async () => {
		const harness = createHarness({
			entry: { ...baseEntry, status: "REVERSED" },
			postings: basePostings,
		});
		await expect(
			reverseLedgerEntry(
				{
					unitOfWork: harness.unitOfWork,
					commandJournal: {
						findByCommandId: async () => null,
						save: async () => {},
					},
				},
				{
					commandId: randomUUID(),
					organizationId: orgId,
					entryId,
					idempotencyKey: "reverse-request-2",
					executionMode: "SIMULATED",
				},
			),
		).rejects.toMatchObject({ code: "ACC_ENTRY_ALREADY_REVERSED" });
	});

	test("rejects cross-tenant entry access", async () => {
		const otherOrg = "22222222-2222-4222-8222-222222222222";
		const harness = createHarness({
			entry: baseEntry,
			postings: basePostings,
		});
		await expect(
			reverseLedgerEntry(
				{
					unitOfWork: harness.unitOfWork,
					commandJournal: {
						findByCommandId: async () => null,
						save: async () => {},
					},
				},
				{
					commandId: randomUUID(),
					organizationId: otherOrg,
					entryId,
					idempotencyKey: "reverse-request-cross",
					executionMode: "SIMULATED",
				},
			),
		).rejects.toMatchObject({ code: "ACC_CROSS_TENANT" });
	});

		test("replays same commandId idempotently", async () => {
		const commandId = randomUUID();
		const harness = createHarness({
			entry: baseEntry,
			postings: basePostings,
		});
		const deps = {
			unitOfWork: harness.unitOfWork,
			commandJournal: {
				findByCommandId: async (id: string) =>
					harness.commandJournal.get(id) ?? null,
				save: async (record: CommandJournalEntry) => {
					harness.commandJournal.set(record.commandId, record);
				},
			},
		};
		const first = await reverseLedgerEntry(deps, {
			commandId,
			organizationId: orgId,
			entryId,
			idempotencyKey: "reverse-request-3",
			executionMode: "SIMULATED",
		});
		const second = await reverseLedgerEntry(deps, {
			commandId,
			organizationId: orgId,
			entryId,
			idempotencyKey: "reverse-request-3",
			executionMode: "SIMULATED",
		});
		expect(second.idempotentReplay).toBe(true);
		expect(second.entryId).toBe(first.entryId);
	});
});
