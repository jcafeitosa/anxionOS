import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface ChartAccountRecord {
	id: string;
	organizationId: string;
	code: string;
	kind: string;
	currency: string;
	status: string;
}
export interface JournalEntryRecord {
	id: string;
	organizationId: string;
	entryKind: string;
	status: string;
	idempotencyKey: string;
	sourceRef: Record<string, unknown> | null;
	valueDate: string;
	executionMode: string;
	capitalAccountId: string | null;
	portfolioId: string | null;
	revision: number;
}
export interface LedgerPostingRecord {
	id: string;
	journalEntryId: string;
	organizationId: string;
	accountCode: string;
	debit: string;
	credit: string;
	asset: string;
	amount: string;
}
export interface ChartAccountRepository {
	findByCode(
		organizationId: string,
		code: string,
	): Promise<ChartAccountRecord | null>;
	ensureDefaultChart(organizationId: string, currency: string): Promise<void>;
}
export interface JournalEntryRepository {
	findById(id: string): Promise<JournalEntryRecord | null>;
	findByIdempotencyKey(
		organizationId: string,
		idempotencyKey: string,
	): Promise<JournalEntryRecord | null>;
	save(record: JournalEntryRecord): Promise<JournalEntryRecord>;
	updateStatus(
		id: string,
		status: string,
		revision: number,
	): Promise<JournalEntryRecord>;
}
export interface LedgerPostingRepository {
	save(record: LedgerPostingRecord): Promise<LedgerPostingRecord>;
	findByEntryId(journalEntryId: string): Promise<LedgerPostingRecord[]>;
}
export interface AccountingTransactionContext {
	commandJournal: CommandJournalRepository;
	chartAccounts: ChartAccountRepository;
	journalEntries: JournalEntryRepository;
	ledgerPostings: LedgerPostingRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface AccountingUnitOfWork {
	runInTransaction<T>(
		work: (ctx: AccountingTransactionContext) => Promise<T>,
	): Promise<T>;
}
