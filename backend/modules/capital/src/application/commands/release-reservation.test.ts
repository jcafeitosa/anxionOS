import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { CAPITAL_EVENT_TYPES } from "@anxionos/contracts/capital";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {
	CapitalTransactionContext,
	CapitalUnitOfWork,
	ReservationRecord,
} from "../../domain/ports/capital-unit-of-work";
import { CapitalCommandError } from "../errors";
import { releaseReservation } from "./release-reservation";

const ORG = "00000000-0000-4000-8000-000000000001";
const ORG_B = "00000000-0000-4000-8000-000000000002";
const ACCOUNT = `cap_acc_${randomUUID()}`;

function createUow(reservation: ReservationRecord) {
	const store = new Map<string, ReservationRecord>([
		[reservation.id, reservation],
	]);
	let published: DomainEventEnvelope[] = [];
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
			async lockForUpdate() {
				return null;
			},
			async save(r) {
				return r;
			},
			async sumHeldReservations() {
				return "0";
			},
			async acquireAccountLock() {},
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
			async findExpiredHeld() {
				return [];
			},
		},
		async publishEvents(events) {
			published = [...published, ...events];
		},
	};
	const unitOfWork: CapitalUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		unitOfWork,
		getStore: () => store,
		getPublished: () => published,
		journal,
	};
}

const RESERVATION_ID = `cap_res_${randomUUID()}`;
const baseReservation: ReservationRecord = {
	id: RESERVATION_ID,
	accountId: ACCOUNT,
	organizationId: ORG,
	portfolioId: randomUUID(),
	grantId: randomUUID(),
	intentHash: "a".repeat(32),
	asset: "USD",
	amount: "100.00",
	reservationKind: "ORDER",
	status: "HELD",
	expiresAt: null,
};

function externalJournal(
	journal: Map<
		string,
		{ organizationId: string; responseSnapshot: Record<string, unknown> }
	>,
) {
	return {
		async findByCommandId(id: string) {
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
		async save(entry: {
			commandId: string;
			organizationId: string;
			commandName: string;
			responseSnapshot: Record<string, unknown>;
		}) {
			journal.set(entry.commandId, {
				organizationId: entry.organizationId,
				responseSnapshot: entry.responseSnapshot,
			});
		},
	};
}

describe("releaseReservation", () => {
	test("partial fill reduces HELD amount", async () => {
		const { unitOfWork, getStore, getPublished, journal } = createUow({
			...baseReservation,
		});
		const result = await releaseReservation(
			{ unitOfWork, commandJournal: externalJournal(journal) },
			{
				commandId: randomUUID(),
				organizationId: ORG,
				reservationId: RESERVATION_ID,
				releaseAmount: "30.00",
				reason: "partial_fill",
			},
		);
		expect(result.reservationId).toBe(RESERVATION_ID);
		expect(getStore().get(RESERVATION_ID)?.amount).toBe("70");
		expect(getStore().get(RESERVATION_ID)?.status).toBe("HELD");
		expect(
			getPublished().some(
				(e) => e.eventType === CAPITAL_EVENT_TYPES.RESERVATION_RELEASED,
			),
		).toBe(true);
	});

	test("full cancel marks RELEASED", async () => {
		const { unitOfWork, getStore, journal } = createUow({ ...baseReservation });
		await releaseReservation(
			{ unitOfWork, commandJournal: externalJournal(journal) },
			{
				commandId: randomUUID(),
				organizationId: ORG,
				reservationId: RESERVATION_ID,
				releaseAmount: "100.00",
				reason: "cancel",
			},
		);
		expect(getStore().get(RESERVATION_ID)?.status).toBe("RELEASED");
		expect(getStore().get(RESERVATION_ID)?.amount).toBe("0");
	});

	test("rejects release exceeding remaining held amount after partial release", async () => {
		const { unitOfWork, getStore, journal } = createUow({ ...baseReservation });
		await releaseReservation(
			{ unitOfWork, commandJournal: externalJournal(journal) },
			{
				commandId: randomUUID(),
				organizationId: ORG,
				reservationId: RESERVATION_ID,
				releaseAmount: "60.00",
				reason: "partial_fill",
			},
		);
		expect(getStore().get(RESERVATION_ID)?.amount).toBe("40");
		await expect(
			releaseReservation(
				{ unitOfWork, commandJournal: externalJournal(journal) },
				{
					commandId: randomUUID(),
					organizationId: ORG,
					reservationId: RESERVATION_ID,
					releaseAmount: "60.00",
					reason: "partial_fill",
				},
			),
		).rejects.toBeInstanceOf(CapitalCommandError);
	});

	test("expired reason marks EXPIRED status", async () => {
		const { unitOfWork, getStore, journal } = createUow({ ...baseReservation });
		await releaseReservation(
			{ unitOfWork, commandJournal: externalJournal(journal) },
			{
				commandId: randomUUID(),
				organizationId: ORG,
				reservationId: RESERVATION_ID,
				releaseAmount: "100.00",
				reason: "expired",
			},
		);
		expect(getStore().get(RESERVATION_ID)?.status).toBe("EXPIRED");
	});

	test("rejects cross-tenant commandId replay", async () => {
		const commandId = randomUUID();
		const { unitOfWork, journal } = createUow({ ...baseReservation });
		await releaseReservation(
			{ unitOfWork, commandJournal: externalJournal(journal) },
			{
				commandId,
				organizationId: ORG,
				reservationId: RESERVATION_ID,
				releaseAmount: "10.00",
				reason: "partial_fill",
			},
		);
		await expect(
			releaseReservation(
				{ unitOfWork, commandJournal: externalJournal(journal) },
				{
					commandId,
					organizationId: ORG_B,
					reservationId: RESERVATION_ID,
					releaseAmount: "10.00",
					reason: "partial_fill",
				},
			),
		).rejects.toMatchObject({ code: "CAP_CROSS_TENANT" });
	});
});
