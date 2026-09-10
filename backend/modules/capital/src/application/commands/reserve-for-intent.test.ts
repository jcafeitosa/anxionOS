import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type {
	AllocationRecord,
	BalanceLineRecord,
	CapitalAccountRecord,
	CapitalTransactionContext,
	CapitalUnitOfWork,
	ReservationRecord,
} from "../../domain/ports/capital-unit-of-work";
import { CapitalCommandError } from "../errors";
import { reserveForIntent } from "./reserve-for-intent";

const ORG = "00000000-0000-4000-8000-000000000001";
const GRANT = "11111111-1111-4111-8111-111111111111";
const PORTFOLIO = "22222222-2222-4222-8222-222222222222";
const ACCOUNT = `cap_acc_${randomUUID()}`;

function createDeps(options?: {
	settled?: string;
	held?: string;
	allocation?: AllocationRecord | null;
}) {
	const settled = options?.settled ?? "1000.00";
	const held = options?.held ?? "0";
	const reservations = new Map<string, ReservationRecord>();
	const balanceLines = new Map<string, BalanceLineRecord>([
		[
			"USD",
			{
				accountId: ACCOUNT,
				asset: "USD",
				settled,
				encumbered: "0",
				reserved: "0",
				revision: 1,
			},
		],
		[
			"EUR",
			{
				accountId: ACCOUNT,
				asset: "EUR",
				settled: "500.00",
				encumbered: "0",
				reserved: "0",
				revision: 1,
			},
		],
	]);
	const account: CapitalAccountRecord = {
		id: ACCOUNT,
		organizationId: ORG,
		ownerUserId: randomUUID(),
		baseCurrency: "USD",
		executionMode: "SIMULATED",
		status: "ACTIVE",
		revision: 1,
	};
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
							commandName: "reserveForIntent",
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
			async findById(id, org) {
				return id === ACCOUNT && org === ORG ? account : null;
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
			async lockForUpdate(_accountId, asset) {
				return balanceLines.get(asset) ?? null;
			},
			async save(r) {
				balanceLines.set(r.asset, r);
				return r;
			},
			async sumHeldReservations(_accountId, asset) {
				let total = 0n;
				for (const row of reservations.values()) {
					if (row.asset === asset && row.status === "HELD") {
						total += BigInt(row.amount.replace(".", ""));
					}
				}
				return held;
			},
			async assertAvailableForReservation(_accountId, asset, amount) {
				const line = balanceLines.get(asset);
				if (!line) {
					throw new Error("CAP_INSUFFICIENT_AVAILABLE:missing_balance_line");
				}
				let heldTotal = 0;
				for (const row of reservations.values()) {
					if (row.asset === asset && row.status === "HELD") {
						heldTotal += Number(row.amount);
					}
				}
				const available = Number(line.settled) - heldTotal;
				if (available < Number(amount)) {
					throw new Error("CAP_INSUFFICIENT_AVAILABLE:exceeds_available");
				}
				return line;
			},
		},
		allocations: {
			async save(r) {
				return r;
			},
			async findActiveByGrant() {
				return options?.allocation ?? null;
			},
		},
		reservations: {
			async findById() {
				return null;
			},
			async findByIdForUpdate() {
				return null;
			},
			async findActiveByIntent(accountId, intentHash) {
				for (const row of reservations.values()) {
					if (
						row.accountId === accountId &&
						row.intentHash === intentHash &&
						row.status === "HELD"
					) {
						return row;
					}
				}
				return null;
			},
			async save(r) {
				reservations.set(r.id, r);
				return r;
			},
			async update(r) {
				reservations.set(r.id, r);
				return r;
			},
			async sumHeldByGrant(accountId, grantId, asset) {
				let total = 0;
				for (const row of reservations.values()) {
					if (
						row.accountId === accountId &&
						row.grantId === grantId &&
						row.asset === asset &&
						row.status === "HELD"
					) {
						total += Number(row.amount);
					}
				}
				return String(total);
			},
			async findExpiredHeld() {
				return [];
			},
		},
		async publishEvents() {},
	};
	const unitOfWork: CapitalUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};
	return {
		deps: {
			unitOfWork,
			commandJournal: ctx.commandJournal,
			grantValidation: {
				async validateGrant() {},
			},
		},
		reservations,
		journal,
	};
}

const baseCommand = {
	organizationId: ORG,
	accountId: ACCOUNT,
	portfolioId: PORTFOLIO,
	grantId: GRANT,
	intentHash: "b".repeat(32),
	asset: "USD",
	amount: "100.00",
	reservationKind: "ORDER" as const,
	executionMode: "SIMULATED" as const,
};

describe("reserveForIntent (ANX-148)", () => {
	test("creates HELD reservation when available", async () => {
		const { deps, reservations } = createDeps();
		const result = await reserveForIntent(deps, {
			...baseCommand,
			commandId: randomUUID(),
		});
		expect(result.reservationId).toMatch(/^cap_res_/);
		const stored = [...reservations.values()][0];
		expect(stored?.status).toBe("HELD");
		expect(stored?.amount).toBe("100.00");
	});

	test("rejects reservation beyond settled available (concurrency guard)", async () => {
		const { deps } = createDeps({ settled: "100.00" });
		await reserveForIntent(deps, {
			...baseCommand,
			commandId: randomUUID(),
			amount: "80.00",
			intentHash: "c".repeat(32),
		});
		await expect(
			reserveForIntent(deps, {
				...baseCommand,
				commandId: randomUUID(),
				amount: "30.00",
				intentHash: "d".repeat(32),
			}),
		).rejects.toMatchObject({ code: "CAP_INSUFFICIENT_AVAILABLE" });
	});

	test("enforces allocation limit per currency independently", async () => {
		const allocation: AllocationRecord = {
			id: `cap_alloc_${randomUUID()}`,
			accountId: ACCOUNT,
			organizationId: ORG,
			portfolioId: PORTFOLIO,
			grantId: GRANT,
			state: "ACTIVE",
			limitAmount: "150.00",
			limitCurrency: "USD",
			revision: 1,
		};
		const { deps } = createDeps({ allocation });
		await reserveForIntent(deps, {
			...baseCommand,
			commandId: randomUUID(),
			amount: "100.00",
			intentHash: "e".repeat(32),
		});
		await expect(
			reserveForIntent(deps, {
				...baseCommand,
				commandId: randomUUID(),
				amount: "60.00",
				intentHash: "f".repeat(32),
			}),
		).rejects.toMatchObject({ code: "CAP_INSUFFICIENT_AVAILABLE" });
	});

	test("allows EUR reservation when USD allocation limit is separate", async () => {
		const allocation: AllocationRecord = {
			id: `cap_alloc_${randomUUID()}`,
			accountId: ACCOUNT,
			organizationId: ORG,
			portfolioId: PORTFOLIO,
			grantId: GRANT,
			state: "ACTIVE",
			limitAmount: "100.00",
			limitCurrency: "USD",
			revision: 1,
		};
		const { deps, reservations } = createDeps({ allocation });
		await reserveForIntent(deps, {
			...baseCommand,
			commandId: randomUUID(),
			asset: "EUR",
			amount: "200.00",
			intentHash: "g".repeat(32),
		});
		expect([...reservations.values()].some((r) => r.asset === "EUR")).toBe(
			true,
		);
	});

	test("replays idempotent commandId", async () => {
		const commandId = randomUUID();
		const { deps } = createDeps();
		const first = await reserveForIntent(deps, {
			...baseCommand,
			commandId,
		});
		const second = await reserveForIntent(deps, {
			...baseCommand,
			commandId,
		});
		expect(second.idempotentReplay).toBe(true);
		expect(second.reservationId).toBe(first.reservationId);
	});

	test("rejects duplicate intent hash", async () => {
		const { deps } = createDeps();
		await reserveForIntent(deps, {
			...baseCommand,
			commandId: randomUUID(),
		});
		await expect(
			reserveForIntent(deps, {
				...baseCommand,
				commandId: randomUUID(),
			}),
		).rejects.toBeInstanceOf(CapitalCommandError);
	});
});
