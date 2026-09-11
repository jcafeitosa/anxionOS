import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { PositionReconciliationCaseKind } from "@anxionos/contracts/portfolios";
import type { CommandJournalRepository } from "./command-journal";
export interface PortfolioRecord {
	id: string;
	organizationId: string;
	ownerUserId: string;
	capitalAccountId: string;
	name: string;
	baseCurrency: string;
	executionMode: string;
	status: string;
	revision: number;
}
export interface PositionRecord {
	id: string;
	portfolioId: string;
	organizationId: string;
	instrumentId: string;
	positionSide: string;
	book: string;
	quantity: string;
	revision: number;
}
export interface HoldingRecord {
	id: string;
	positionId: string;
	organizationId: string;
	fillId: string;
	quantity: string;
	price: string;
	revision: number;
}
export interface ValuationSnapshotRecord {
	id: string;
	organizationId: string;
	portfolioId: string;
	asOf: string;
	valuationVersion: number;
	status: string;
	priceRefsJson: unknown;
	fxRefsJson: unknown;
	navBase: string;
	navComponentsJson: unknown;
	qualityFlagsJson: unknown;
	revision: number;
}
export interface PortfolioRepository {
	findById(id: string): Promise<PortfolioRecord | null>;
	findByOrganizationId(organizationId: string): Promise<PortfolioRecord[]>;
	save(record: PortfolioRecord): Promise<PortfolioRecord>;
}
export interface PositionRepository {
	findByPositionKey(
		portfolioId: string,
		instrumentId: string,
		positionSide: string,
		book: string,
	): Promise<PositionRecord | null>;
	findByPortfolioId(portfolioId: string): Promise<PositionRecord[]>;
	save(record: PositionRecord): Promise<PositionRecord>;
	updateQuantity(
		id: string,
		delta: string,
		revision: number,
	): Promise<PositionRecord>;
}
export interface ValuationSnapshotRepository {
	findByPortfolioAsOf(
		portfolioId: string,
		asOf: string,
		valuationVersion: number,
	): Promise<ValuationSnapshotRecord | null>;
	findLatestByPortfolioId(
		portfolioId: string,
	): Promise<ValuationSnapshotRecord | null>;
	save(record: ValuationSnapshotRecord): Promise<ValuationSnapshotRecord>;
}
export interface HoldingRepository {
	findByFillId(
		organizationId: string,
		fillId: string,
	): Promise<HoldingRecord | null>;
	save(record: HoldingRecord): Promise<HoldingRecord>;
}
export interface ProvisionalCashRecord {
	id: string;
	organizationId: string;
	portfolioId: string;
	fillId: string;
	cashDelta: string;
	asset: string;
	settled: boolean;
	journalEntryId: string | null;
}
export interface ProvisionalCashRepository {
	findByFillId(
		organizationId: string,
		fillId: string,
	): Promise<ProvisionalCashRecord | null>;
	save(record: ProvisionalCashRecord): Promise<ProvisionalCashRecord>;
	markSettled(
		id: string,
		journalEntryId: string,
	): Promise<ProvisionalCashRecord>;
}
export interface LedgerApplicationRecord {
	id: string;
	organizationId: string;
	portfolioId: string;
	journalEntryId: string;
	cashDelta: string;
	asset: string;
	fillId: string | null;
}
export interface LedgerApplicationRepository {
	findByJournalEntryId(
		organizationId: string,
		journalEntryId: string,
	): Promise<LedgerApplicationRecord | null>;
	save(record: LedgerApplicationRecord): Promise<LedgerApplicationRecord>;
}
export interface PositionReconciliationCaseRecord {
	id: string;
	organizationId: string;
	portfolioId: string;
	positionId: string | null;
	caseKind: PositionReconciliationCaseKind;
	status: string;
	fillId: string | null;
	journalEntryId: string | null;
	evidence: string | null;
	disposition: string | null;
	dispositionRationale: string | null;
	openedAt: string;
	resolvedAt: string | null;
}
export interface PositionReconciliationCaseRepository {
	findById(id: string): Promise<PositionReconciliationCaseRecord | null>;
	findOpenByFillId(
		organizationId: string,
		fillId: string,
		caseKind: PositionReconciliationCaseKind,
	): Promise<PositionReconciliationCaseRecord | null>;
	save(
		record: PositionReconciliationCaseRecord,
	): Promise<PositionReconciliationCaseRecord>;
	update(
		record: PositionReconciliationCaseRecord,
	): Promise<PositionReconciliationCaseRecord>;
}
export interface PortfoliosTransactionContext {
	commandJournal: CommandJournalRepository;
	portfolios: PortfolioRepository;
	positions: PositionRepository;
	holdings: HoldingRepository;
	valuationSnapshots: ValuationSnapshotRepository;
	provisionalCash: ProvisionalCashRepository;
	ledgerApplications: LedgerApplicationRepository;
	reconciliationCases: PositionReconciliationCaseRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface PortfoliosUnitOfWork {
	runInTransaction<T>(
		work: (ctx: PortfoliosTransactionContext) => Promise<T>,
	): Promise<T>;
}
