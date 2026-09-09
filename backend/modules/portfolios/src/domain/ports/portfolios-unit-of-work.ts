import type { DomainEventEnvelope } from "@anxionos/contracts/events";
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
export interface PortfolioRepository {
    findById(id: string): Promise<PortfolioRecord | null>;
    save(record: PortfolioRecord): Promise<PortfolioRecord>;
}
export interface PositionRepository {
    findByPositionKey(portfolioId: string, instrumentId: string, positionSide: string, book: string): Promise<PositionRecord | null>;
    save(record: PositionRecord): Promise<PositionRecord>;
    updateQuantity(id: string, delta: string, revision: number): Promise<PositionRecord>;
}
export interface HoldingRepository {
    findByFillId(organizationId: string, fillId: string): Promise<HoldingRecord | null>;
    save(record: HoldingRecord): Promise<HoldingRecord>;
}
export interface PortfoliosTransactionContext {
    commandJournal: CommandJournalRepository;
    portfolios: PortfolioRepository;
    positions: PositionRepository;
    holdings: HoldingRepository;
    publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface PortfoliosUnitOfWork {
    runInTransaction<T>(work: (ctx: PortfoliosTransactionContext) => Promise<T>): Promise<T>;
}
