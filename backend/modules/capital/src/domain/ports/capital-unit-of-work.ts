import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface CapitalAccountRecord {
	id: string;
	organizationId: string;
	ownerUserId: string;
	baseCurrency: string;
	executionMode: string;
	status: string;
	revision: number;
}
export interface BalanceLineRecord {
	accountId: string;
	asset: string;
	settled: string;
	encumbered: string;
	reserved: string;
	revision: number;
}
export interface AllocationRecord {
	id: string;
	accountId: string;
	organizationId: string;
	portfolioId: string;
	grantId: string;
	state: string;
	limitAmount: string;
	limitCurrency: string;
	revision: number;
}
export interface ReservationRecord {
	id: string;
	accountId: string;
	organizationId: string;
	portfolioId: string;
	grantId: string;
	intentHash: string;
	asset: string;
	amount: string;
	reservationKind: string;
	status: string;
	expiresAt: string | null;
}
export interface CapitalAccountRepository {
	findById(
		accountId: string,
		organizationId: string,
	): Promise<CapitalAccountRecord | null>;
	findActiveByNaturalKey(
		organizationId: string,
		ownerUserId: string,
	): Promise<CapitalAccountRecord | null>;
	save(record: CapitalAccountRecord): Promise<CapitalAccountRecord>;
}
export interface BalanceLineRepository {
	lockForUpdate(
		accountId: string,
		asset: string,
	): Promise<BalanceLineRecord | null>;
	save(record: BalanceLineRecord): Promise<BalanceLineRecord>;
	sumHeldReservations(accountId: string, asset: string): Promise<string>;
	acquireAccountLock(accountId: string): Promise<void>;
	assertAvailableForReservation(
		accountId: string,
		asset: string,
		amount: string,
	): Promise<BalanceLineRecord>;
}
export interface AllocationRepository {
	save(record: AllocationRecord): Promise<AllocationRecord>;
	findActiveByGrant(
		accountId: string,
		organizationId: string,
		grantId: string,
	): Promise<AllocationRecord | null>;
}
export interface ReservationRepository {
	findById(
		reservationId: string,
		organizationId: string,
	): Promise<ReservationRecord | null>;
	findByIdForUpdate(
		reservationId: string,
		organizationId: string,
	): Promise<ReservationRecord | null>;
	findActiveByIntent(
		accountId: string,
		intentHash: string,
	): Promise<ReservationRecord | null>;
	save(record: ReservationRecord): Promise<ReservationRecord>;
	update(record: ReservationRecord): Promise<ReservationRecord>;
	sumHeldByGrant(
		accountId: string,
		grantId: string,
		asset: string,
	): Promise<string>;
	findExpiredHeld(
		organizationId: string,
		asOf: string,
		limit: number,
	): Promise<ReservationRecord[]>;
}
export interface CapitalTransactionContext {
	commandJournal: CommandJournalRepository;
	accounts: CapitalAccountRepository;
	balanceLines: BalanceLineRepository;
	allocations: AllocationRepository;
	reservations: ReservationRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface CapitalUnitOfWork {
	runInTransaction<T>(
		work: (ctx: CapitalTransactionContext) => Promise<T>,
	): Promise<T>;
}
