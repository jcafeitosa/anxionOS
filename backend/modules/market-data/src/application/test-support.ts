import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { BackfillJobRecord } from "../domain/ports/backfill-repository";
import type { CommandJournalRepository } from "../domain/ports/command-journal";
import type {
	InstrumentRecord,
	MarketDataTransactionContext,
	MarketDataUnitOfWork,
} from "../domain/ports/market-data-unit-of-work";

export type { InstrumentRecord };

export const ORG = "00000000-0000-4000-8000-000000000001";
export const INSTRUMENT_ID = "md_ins_00000000-0000-4000-8000-000000000002";

export function activeInstrument(): InstrumentRecord {
	return {
		id: INSTRUMENT_ID,
		organizationId: ORG,
		canonicalSymbol: "BTC-USD",
		instrumentKind: "SPOT",
		assetId: "btc",
		venueId: "binance",
		executionMode: "SIMULATED",
		status: "ACTIVE",
		revision: 1,
	};
}

export function createInMemoryUow(instrument: InstrumentRecord) {
	const commandJournalStore = new Map<string, Record<string, unknown>>();
	const jobsById = new Map<string, BackfillJobRecord>();
	const jobsByNatural = new Map<string, BackfillJobRecord>();
	let published: DomainEventEnvelope[] = [];

	const ctx: MarketDataTransactionContext = {
		commandJournal: {
			async findByCommandId(commandId) {
				const snapshot = commandJournalStore.get(commandId);
				if (!snapshot) return null;
				return {
					commandId,
					organizationId: String(
						snapshot.organizationId ?? instrument.organizationId,
					),
					commandName: String(snapshot.commandName ?? "startBackfill"),
					responseSnapshot: snapshot,
				};
			},
			async save(entry) {
				commandJournalStore.set(entry.commandId, {
					...entry.responseSnapshot,
					organizationId: entry.organizationId,
					commandName: entry.commandName,
				});
			},
		},
		instruments: {
			async findById(instrumentId, organizationId) {
				if (
					instrument.id === instrumentId &&
					instrument.organizationId === organizationId
				) {
					return instrument;
				}
				return null;
			},
			async findActiveByNaturalKey() {
				return instrument.status === "ACTIVE" ? instrument : null;
			},
			async save(record) {
				return record;
			},
		},
		observations: {
			async findBySourceEventId() {
				return null;
			},
			async findLatestByInstrument() {
				return null;
			},
			async saveHeader(record) {
				return record;
			},
			async insertTimeseries() {},
		},
		marketDataFxRates: {
			async findLatestAsOf() {
				return null;
			},
			async save(rate) {
				return rate;
			},
		},
		corporateActions: {
			async findByInstrumentAsOf() {
				return [];
			},
			async save(action) {
				return action;
			},
		},
		backfillJobs: {
			async findById(jobId, organizationId) {
				const job = jobsById.get(jobId);
				if (!job || job.organizationId !== organizationId) return null;
				return job;
			},
			async findActiveByInstrument(organizationId, instrumentId) {
				for (const job of jobsById.values()) {
					if (
						job.organizationId === organizationId &&
						job.instrumentId === instrumentId &&
						(job.status === "PENDING" ||
							job.status === "RUNNING" ||
							job.status === "PAUSED")
					) {
						return job;
					}
				}
				return null;
			},
			async save(record) {
				const key = `${record.organizationId}:${record.instrumentId}:${record.requestedFrom}:${record.requestedTo}`;
				const existing = jobsByNatural.get(key);
				if (existing) return existing;
				jobsByNatural.set(key, record);
				jobsById.set(record.id, record);
				return record;
			},
			async advanceCursor(input) {
				const existing = jobsById.get(input.id);
				if (!existing || existing.organizationId !== input.organizationId) {
					return null;
				}
				if (existing.status !== "PENDING" && existing.status !== "RUNNING") {
					return null;
				}
				if (existing.rowsIngested > input.rowsIngested) return null;
				const updated: BackfillJobRecord = {
					...existing,
					cursorPosition: input.cursorPosition,
					rowsIngested: input.rowsIngested,
					status: input.status,
					lastError: input.lastError,
					updatedAt: new Date().toISOString(),
				};
				jobsById.set(updated.id, updated);
				return updated;
			},
		},
		calendarRepository: {
			async findVenueCalendar() {
				return null;
			},
			async findSession() {
				return null;
			},
			async saveVenueCalendar(record) {
				return record;
			},
			async saveSession(record) {
				return record;
			},
		},
		async publishEvents(envelopes) {
			published = [...published, ...envelopes];
		},
	};

	const unitOfWork: MarketDataUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};

	return {
		unitOfWork,
		commandJournal: ctx.commandJournal as CommandJournalRepository,
		getPublished: () => published,
	};
}
