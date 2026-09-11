import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { EXECUTION_MODULE_EVENT_TYPES } from "@anxionos/contracts/execution";
import {
	cancelOrder,
	createExecutionUnitOfWork,
	createPgCommandJournalRepository,
	createPgRiskPermitValidationPort,
	InMemoryExecutionCapitalNotifyAdapter,
	openExecutionSession,
	recordFill,
	SimulatedVenueAdapter,
	submitOrder,
} from "@anxionos/execution";
import {
	EXECUTION_TEST_AUTHORITY_EPOCH,
	EXECUTION_TEST_INSTRUMENT_ID,
	EXECUTION_TEST_INTENT_HASH,
	EXECUTION_TEST_ORG_B,
	EXECUTION_TEST_ORG_ID,
	EXECUTION_TEST_RISK_EPOCH,
	seedRiskPermitForTests,
	shouldRunPgIntegrationTests,
	withExecutionPgHarness,
} from "../test-support";

function createDeps(
	pool: Parameters<typeof createExecutionUnitOfWork>[0],
	capitalNotify = new InMemoryExecutionCapitalNotifyAdapter(),
) {
	return {
		unitOfWork: createExecutionUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		riskPermitValidation: createPgRiskPermitValidationPort(pool),
		simulatedVenueAdapter: new SimulatedVenueAdapter(),
		capitalNotify,
	};
}

describe("execution lifecycle commands (ANX-151 S2)", () => {
	test("G3-EX-S2-01: openExecutionSession → submitOrder happy path", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			expect(opened.sessionId).toMatch(/^ex_ses_/);
			expect(opened.revision).toBe(1);

			const sessionRow = await pool.query(
				`SELECT status, intent_hash, risk_permit_id
				 FROM execution_sessions WHERE id = $1`,
				[opened.sessionId],
			);
			expect(sessionRow.rows[0]?.status).toBe("OPEN");
			expect(sessionRow.rows[0]?.intent_hash).toBe(EXECUTION_TEST_INTENT_HASH);
			expect(sessionRow.rows[0]?.risk_permit_id).toBe(riskPermitId);

			const clientOrderId = `client-${randomUUID()}`;
			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				asset: "USD",
			});

			expect(submitted.orderId).toMatch(/^ex_ord_/);
			expect(submitted.fillId).toMatch(/^ex_fill_/);
			expect(submitted.venueFillId).toMatch(/^sim_vfill_/);

			const orderRow = await pool.query(
				`SELECT status, client_order_id FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.status).toBe("SUBMITTED");
			expect(orderRow.rows[0]?.client_order_id).toBe(clientOrderId);

			const fillRow = await pool.query(
				`SELECT status, notional_amount FROM execution_fills WHERE id = $1`,
				[submitted.fillId],
			);
			expect(fillRow.rows[0]?.status).toBe("CONFIRMED");
			expect(fillRow.rows[0]?.notional_amount).toBe("100.00000000");
		});
	});

	test("G3-EX-S2-01: openExecutionSession without valid permit → EX_PERMIT_BYPASS", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);

			await expect(
				openExecutionSession(deps, {
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					intentHash: EXECUTION_TEST_INTENT_HASH,
					riskPermitId: `rk_pmt_${randomUUID()}`,
					authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
					riskEpoch: EXECUTION_TEST_RISK_EPOCH,
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "EX_PERMIT_BYPASS" });

			const sessionCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_sessions`,
			);
			expect(sessionCount.rows[0]?.c).toBe(0);
		});
	});

	test("G3-EX-S2-02: submitOrder revalidates permit before effect → EX_PERMIT_STALE", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			await pool.query(
				`UPDATE risk_permits SET risk_epoch = $1 WHERE id = $2`,
				[EXECUTION_TEST_RISK_EPOCH + 1, riskPermitId],
			);

			await expect(
				submitOrder(deps, {
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					sessionId: opened.sessionId!,
					clientOrderId: `client-${randomUUID()}`,
					instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
				}),
			).rejects.toMatchObject({ code: "EX_PERMIT_STALE" });

			const orderCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_orders`,
			);
			expect(orderCount.rows[0]?.c).toBe(0);
		});
	});

	test("G3-EX-S2-03: cross-tenant commandId replay on openExecutionSession → EX_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);
			const commandId = randomUUID();

			await openExecutionSession(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			await expect(
				openExecutionSession(deps, {
					commandId,
					organizationId: EXECUTION_TEST_ORG_B,
					intentHash: EXECUTION_TEST_INTENT_HASH,
					riskPermitId,
					authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
					riskEpoch: EXECUTION_TEST_RISK_EPOCH,
					executionMode: "SIMULATED",
				}),
			).rejects.toMatchObject({ code: "EX_CROSS_TENANT" });

			const orgBSessions = await pool.query(
				`SELECT id FROM execution_sessions WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_B],
			);
			expect(orgBSessions.rowCount).toBe(0);
		});
	});

	test("G3-EX-S2-03: cross-tenant commandId replay on submitOrder → EX_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const commandId = randomUUID();
			const clientOrderId = `client-${randomUUID()}`;

			await submitOrder(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
			});

			await expect(
				submitOrder(deps, {
					commandId,
					organizationId: EXECUTION_TEST_ORG_B,
					sessionId: opened.sessionId!,
					clientOrderId: `other-${randomUUID()}`,
					instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
					side: "BUY",
					quantity: "1.0",
					price: "100.0",
				}),
			).rejects.toMatchObject({ code: "EX_CROSS_TENANT" });

			const orgBOrders = await pool.query(
				`SELECT id FROM execution_orders WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_B],
			);
			expect(orgBOrders.rowCount).toBe(0);
		});
	});

	test("idempotent replay by commandId returns same aggregate without duplicate side effects", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);
			const commandId = randomUUID();

			const first = await openExecutionSession(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});
			const replay = await openExecutionSession(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			expect(replay).toMatchObject({
				sessionId: first.sessionId,
				idempotentReplay: true,
			});

			const sessionCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_sessions WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_ID],
			);
			expect(sessionCount.rows[0]?.c).toBe(1);
		});
	});

	test("submitOrder idempotent replay by clientOrderId", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const clientOrderId = `client-${randomUUID()}`;
			const first = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
			});
			const replay = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
			});

			expect(replay).toMatchObject({
				orderId: first.orderId,
				fillId: first.fillId,
				idempotentReplay: true,
			});

			const orderCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_orders WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_ID],
			);
			expect(orderCount.rows[0]?.c).toBe(1);
		});
	});

	test("G3-EX-S2-01: submitOrder emits order.submitted and fill.confirmed atomically", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "2.0",
				price: "50.0",
			});

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'execution'
				 ORDER BY occurred_at`,
			);
			expect(journalRows.rowCount).toBe(3);
			expect(journalRows.rows[0]?.event_type).toBe(
				EXECUTION_MODULE_EVENT_TYPES.SESSION_OPENED,
			);
			expect(journalRows.rows[1]?.event_type).toBe(
				EXECUTION_MODULE_EVENT_TYPES.ORDER_SUBMITTED,
			);
			expect(journalRows.rows[1]?.payload).toMatchObject({
				orderId: submitted.orderId,
				sessionId: opened.sessionId,
				organizationId: EXECUTION_TEST_ORG_ID,
				executionMode: "SIMULATED",
			});
			expect(journalRows.rows[2]?.event_type).toBe(
				EXECUTION_MODULE_EVENT_TYPES.FILL_CONFIRMED,
			);
			expect(journalRows.rows[2]?.payload).toMatchObject({
				fillId: submitted.fillId,
				orderId: submitted.orderId,
				notionalAmount: "100",
			});

			const outboxRows = await pool.query(
				`SELECT event_type, status
				 FROM outbox
				 WHERE owner_domain = 'execution'
				 ORDER BY occurred_at`,
			);
			expect(outboxRows.rowCount).toBe(3);
			expect(outboxRows.rows.every((row) => row.status === "pending")).toBe(
				true,
			);
			expect(outboxRows.rows.map((row) => row.event_type)).toEqual([
				EXECUTION_MODULE_EVENT_TYPES.SESSION_OPENED,
				EXECUTION_MODULE_EVENT_TYPES.ORDER_SUBMITTED,
				EXECUTION_MODULE_EVENT_TYPES.FILL_CONFIRMED,
			]);
		});
	});
});

describe("execution lifecycle commands (ANX-151 S3)", () => {
	test("G3-EX-S3-01: cancelOrder on SUBMITTED order → CANCELLED + order.cancelled event", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const capitalNotify = new InMemoryExecutionCapitalNotifyAdapter();
			const deps = createDeps(pool, capitalNotify);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "4.0",
				price: "25.0",
				deferFill: true,
			});

			const cancelled = await cancelOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
				capitalAccountId: "cap_test",
				reservationId: "res_test",
			});

			expect(cancelled.orderStatus).toBe("CANCELLED");
			expect(cancelled.remainingQuantity).toBe("4");

			const orderRow = await pool.query(
				`SELECT status, filled_quantity FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.status).toBe("CANCELLED");
			expect(orderRow.rows[0]?.filled_quantity).toBe("0");

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'execution'
				 ORDER BY occurred_at`,
			);
			const cancelledEvent = journalRows.rows.find(
				(row) =>
					row.event_type === EXECUTION_MODULE_EVENT_TYPES.ORDER_CANCELLED,
			);
			expect(cancelledEvent?.payload).toMatchObject({
				orderId: submitted.orderId,
				remainingQuantity: "4",
				filledQuantity: "0",
			});

			expect(capitalNotify.cancelNotifications).toHaveLength(1);
			expect(capitalNotify.cancelNotifications[0]).toMatchObject({
				orderId: submitted.orderId,
				remainingQuantity: "4",
				capitalAccountId: "cap_test",
				reservationId: "res_test",
			});
		});
	});

	test("G3-EX-S3-02: partial fill → PARTIALLY_FILLED + capital hook on fill", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const capitalNotify = new InMemoryExecutionCapitalNotifyAdapter();
			const deps = createDeps(pool, capitalNotify);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "10.0",
				price: "10.0",
				fillQuantity: "4.0",
				capitalAccountId: "cap_partial",
			});

			expect(submitted.orderStatus).toBe("PARTIALLY_FILLED");
			expect(submitted.remainingQuantity).toBe("6");

			const orderRow = await pool.query(
				`SELECT status, filled_quantity FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.status).toBe("PARTIALLY_FILLED");
			expect(String(Number(orderRow.rows[0]?.filled_quantity))).toBe("4");

			expect(capitalNotify.fillNotifications).toHaveLength(1);
			expect(capitalNotify.fillNotifications[0]?.notionalAmount).toBe("40");
		});
	});

	test("G3-EX-S3-03: race cancel vs fill — cancel wins on deferred order", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "2.0",
				price: "50.0",
				deferFill: true,
			});

			await cancelOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
			});

			await expect(
				recordFill(deps, {
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					orderId: submitted.orderId!,
					fillQuantity: "2.0",
				}),
			).rejects.toMatchObject({ code: "EX_ORDER_NOT_FILLABLE" });

			const fillCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_fills WHERE order_id = $1`,
				[submitted.orderId],
			);
			expect(fillCount.rows[0]?.c).toBe(0);
		});
	});

	test("G3-EX-S3-04: recordFill completes partial order → FILLED", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const capitalNotify = new InMemoryExecutionCapitalNotifyAdapter();
			const deps = createDeps(pool, capitalNotify);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "10.0",
				price: "10.0",
				fillQuantity: "4.0",
			});

			const completed = await recordFill(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
				fillQuantity: "6.0",
			});

			expect(completed.orderStatus).toBe("FILLED");
			expect(completed.remainingQuantity).toBe("0");
			expect(capitalNotify.fillNotifications).toHaveLength(2);
		});
	});

	test("G3-EX-S3-05: conflicting clientOrderId payload → EX_DUPLICATE_CLIENT_ORDER", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const clientOrderId = `client-${randomUUID()}`;
			await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
			});

			await expect(
				submitOrder(deps, {
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					sessionId: opened.sessionId!,
					clientOrderId,
					instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
					side: "BUY",
					quantity: "2.0",
					price: "100.0",
				}),
			).rejects.toMatchObject({ code: "EX_DUPLICATE_CLIENT_ORDER" });

			const orderCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_orders WHERE client_order_id = $1`,
				[clientOrderId],
			);
			expect(orderCount.rows[0]?.c).toBe(1);
		});
	});

	test("G3-EX-S3-06: cross-tenant commandId replay on cancelOrder → EX_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				deferFill: true,
			});

			const commandId = randomUUID();
			await cancelOrder(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
			});

			await expect(
				cancelOrder(deps, {
					commandId,
					organizationId: EXECUTION_TEST_ORG_B,
					orderId: submitted.orderId!,
				}),
			).rejects.toMatchObject({ code: "EX_CROSS_TENANT" });

			const orderRow = await pool.query(
				`SELECT status FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.status).toBe("CANCELLED");
		});
	});

	test("G3-EX-S3-07: cancel partial order preserves filled quantity and releases remainder", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const capitalNotify = new InMemoryExecutionCapitalNotifyAdapter();
			const deps = createDeps(pool, capitalNotify);
			const riskPermitId = await seedRiskPermitForTests(pool);

			const opened = await openExecutionSession(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				intentHash: EXECUTION_TEST_INTENT_HASH,
				riskPermitId,
				authorityEpoch: EXECUTION_TEST_AUTHORITY_EPOCH,
				riskEpoch: EXECUTION_TEST_RISK_EPOCH,
				executionMode: "SIMULATED",
			});

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId: opened.sessionId!,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "10.0",
				price: "10.0",
				fillQuantity: "3.0",
			});

			const cancelled = await cancelOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
			});

			expect(cancelled.remainingQuantity).toBe("7");

			const orderRow = await pool.query(
				`SELECT status, filled_quantity FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.status).toBe("CANCELLED");
			expect(orderRow.rows[0]?.filled_quantity).toBe("3");

			const fillCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_fills WHERE order_id = $1`,
				[submitted.orderId],
			);
			expect(fillCount.rows[0]?.c).toBe(1);
			expect(capitalNotify.cancelNotifications[0]?.remainingQuantity).toBe("7");
		});
	});
});
