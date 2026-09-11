import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type {
	CapitalTransactionContext,
	CapitalUnitOfWork,
	ReservationRecord,
} from "../../domain/ports/capital-unit-of-work";
import { sweepExpiredReservations } from "./sweep-expired-reservations";

const ORG = "00000000-0000-4000-8000-000000000001";
const ACCOUNT = `cap_acc_${randomUUID()}`;
const RESERVATION_ID = `cap_res_${randomUUID()}`;

function createSweepDeps(reservation: ReservationRecord) {
	const store = new Map<string, ReservationRecord>([
		[reservation.id, reservation],
	]);
	const journal = new Map<
		string,
		{ organizationId: string; responseSnapshot: Record<string, unknown> }
	>();
	const ctx: CapitalTransactionContext = {
		commandJournal: {
			async findByCommandId(id) {
				const entry = journal.get(id);
				return entry
					? {
							commandId: id,
							organizationId: entry.organizationId,
							commandName: "releaseReservation",
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
		accounts: {
			async findById() {
				return null;
			},
			async findActiveByNaturalKey() {
				return null;
			},
			async save(r) {
				return r;
			},
		},
		balanceLines: {
			async acquireAccountLock() {},
			async lockForUpdate() {
				return null;
			},
			async save(r) {
				return r;
			},
			async sumHeldReservations() {
				return "0";
			},
			async assertAvailableForReservation() {
				throw new Error("n/a");
			},
		},
		allocations: {
			async save(r) {
				return r;
			},
			async findActiveByGrant() {
				return null;
			},
		},
		reservations: {
			async findById(id, org) {
				const row = store.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async findByIdForUpdate(id, org) {
				const row = store.get(id);
				return row && row.organizationId === org ? row : null;
			},
			async findActiveByIntent() {
				return null;
			},
			async save(r) {
				store.set(r.id, r);
				return r;
			},
			async update(r) {
				store.set(r.id, r);
				return r;
			},
			async sumHeldByGrant() {
				return "0";
			},
			async findExpiredHeld(organizationId, asOf, limit) {
				return [...store.values()]
					.filter(
						(row) =>
							row.organizationId === organizationId &&
							row.status === "HELD" &&
							row.expiresAt &&
							row.expiresAt <= asOf,
					)
					.slice(0, limit);
			},
		},
		async publishEvents() {},
	};
	const unitOfWork: CapitalUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return { unitOfWork, commandJournal: ctx.commandJournal, store };
}

describe("sweepExpiredReservations (ANX-148)", () => {
	test("expires HELD reservations past expiresAt", async () => {
		const reservation: ReservationRecord = {
			id: RESERVATION_ID,
			accountId: ACCOUNT,
			organizationId: ORG,
			portfolioId: randomUUID(),
			grantId: randomUUID(),
			intentHash: "h".repeat(32),
			asset: "USD",
			amount: "50.00",
			reservationKind: "ORDER",
			status: "HELD",
			expiresAt: "2026-09-10T12:00:00.000Z",
		};
		const { unitOfWork, commandJournal, store } = createSweepDeps(reservation);
		const result = await sweepExpiredReservations(
			{ unitOfWork, commandJournal },
			{
				organizationId: ORG,
				asOf: "2026-09-10T13:00:00.000Z",
			},
		);
		expect(result.expiredCount).toBe(1);
		expect(store.get(RESERVATION_ID)?.status).toBe("EXPIRED");
		expect(store.get(RESERVATION_ID)?.amount).toBe("0");
	});
});
