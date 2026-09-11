import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { EXECUTION_MODULE_EVENT_TYPES } from "@anxionos/contracts/execution";
import {
	createExecutionUnitOfWork,
	createPgCommandJournalRepository,
	createPgRiskPermitValidationPort,
	openExecutionSession,
	openVenueReconciliationCase,
	reconcileUnknownDispatch,
	recordFill,
	resolveVenueReconciliationCase,
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

function createDeps(pool: Parameters<typeof createExecutionUnitOfWork>[0]) {
	return {
		unitOfWork: createExecutionUnitOfWork(pool),
		commandJournal: createPgCommandJournalRepository(pool),
		riskPermitValidation: createPgRiskPermitValidationPort(pool),
		simulatedVenueAdapter: new SimulatedVenueAdapter(),
	};
}

async function openSession(
	deps: ReturnType<typeof createDeps>,
	pool: Parameters<typeof createExecutionUnitOfWork>[0],
) {
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
	const sessionRow = await pool.query(
		`SELECT venue_adapter_ref_id FROM execution_sessions WHERE id = $1`,
		[opened.sessionId],
	);
	return {
		sessionId: opened.sessionId!,
		venueAdapterRefId: String(sessionRow.rows[0]?.venue_adapter_ref_id),
	};
}

describe("execution reconciliation (ANX-151 S4)", () => {
	test("G3-EX-S4-01: duplicate venueFillId → EX_DUPLICATE_FILL + audited ReconciliationCase", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId, venueAdapterRefId } = await openSession(deps, pool);
			const clientOrderId = `client-${randomUUID()}`;

			const first = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "2.0",
				price: "50.0",
				fillQuantity: "1.0",
			});

			await expect(
				recordFill(deps, {
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					orderId: first.orderId!,
					fillQuantity: "1.0",
				}),
			).rejects.toMatchObject({
				code: "EX_DUPLICATE_FILL",
				reconciliationCaseId: expect.stringMatching(/^ex_rc_/),
				disposition: "LINKED_EXISTING_FILL",
			});

			const caseRows = await pool.query(
				`SELECT case_kind, status, disposition, fill_id
				 FROM execution_reconciliation_cases
				 WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_ID],
			);
			expect(caseRows.rowCount).toBe(1);
			expect(caseRows.rows[0]).toMatchObject({
				case_kind: "DUPLICATE_VENUE_FILL",
				status: "RESOLVED",
				disposition: "LINKED_EXISTING_FILL",
				fill_id: first.fillId,
			});

			const journalRows = await pool.query(
				`SELECT event_type FROM domain_journal
				 WHERE owner_domain = 'execution'
				   AND event_type LIKE 'execution.reconciliation.%'
				 ORDER BY occurred_at`,
			);
			expect(journalRows.rows.map((row) => row.event_type)).toEqual([
				EXECUTION_MODULE_EVENT_TYPES.RECONCILIATION_OPENED,
				EXECUTION_MODULE_EVENT_TYPES.RECONCILIATION_RESOLVED,
			]);

			const fillCount = await pool.query(
				`SELECT count(*)::int AS c FROM execution_fills WHERE order_id = $1`,
				[first.orderId],
			);
			expect(fillCount.rows[0]?.c).toBe(1);
			expect(venueAdapterRefId).toMatch(/^ex_vad_/);
		});
	});

	test("G3-EX-S4-02: dispatch timeout → UNKNOWN until reconcile evidence", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId } = await openSession(deps, pool);

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "3.0",
				price: "10.0",
				deferFill: true,
				simulateDispatchTimeout: true,
			});

			expect(submitted.venueDispatchStatus).toBe("UNKNOWN");

			const orderRow = await pool.query(
				`SELECT venue_dispatch_status FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.venue_dispatch_status).toBe("UNKNOWN");

			const attemptRow = await pool.query(
				`SELECT status, error_code FROM execution_order_attempts WHERE order_id = $1`,
				[submitted.orderId],
			);
			expect(attemptRow.rows[0]).toMatchObject({
				status: "TIMEOUT",
				error_code: "VENUE_TIMEOUT",
			});

			await expect(
				recordFill(deps, {
					commandId: randomUUID(),
					organizationId: EXECUTION_TEST_ORG_ID,
					orderId: submitted.orderId!,
					fillQuantity: "3.0",
				}),
			).rejects.toMatchObject({ code: "EX_BLIND_RETRY_FORBIDDEN" });
		});
	});

	test("G3-EX-S4-03: correlate lookup finds existing fill before blind retry", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId } = await openSession(deps, pool);
			const clientOrderId = `client-${randomUUID()}`;

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "5.0",
				price: "20.0",
				deferFill: true,
			});

			const filled = await recordFill(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
				fillQuantity: "5.0",
			});
			const venueFillId = filled.venueFillId!;

			await pool.query(
				`UPDATE execution_orders
				 SET venue_dispatch_status = 'UNKNOWN'
				 WHERE id = $1`,
				[submitted.orderId],
			);

			const reconciled = await reconcileUnknownDispatch(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
				venueFillId,
				clientOrderId,
				decision: "CONFIRM_EXISTING",
				rationale: "correlated fill by venueFillId before retry",
			});

			expect(reconciled.venueDispatchStatus).toBe("ACK");
			expect(reconciled.disposition).toBe("CONFIRMED_EXISTING");
			expect(reconciled.fillId).toMatch(/^ex_fill_/);
		});
	});

	test("G3-EX-S4-04: open + resolve ORDER_STATUS_MISMATCH with audited resolution", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId, venueAdapterRefId } = await openSession(deps, pool);

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				deferFill: true,
			});

			const opened = await openVenueReconciliationCase(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				caseKind: "ORDER_STATUS_MISMATCH",
				orderId: submitted.orderId!,
				venueAdapterRefId,
				evidence: "venue reports FILLED, internal SUBMITTED",
			});

			const resolved = await resolveVenueReconciliationCase(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				caseId: opened.reconciliationCaseId!,
				disposition: "STATUS_ALIGNED",
				rationale: "aligned venue status with internal order",
			});

			expect(resolved.disposition).toBe("STATUS_ALIGNED");

			const caseRow = await pool.query(
				`SELECT status, disposition FROM execution_reconciliation_cases WHERE id = $1`,
				[opened.reconciliationCaseId],
			);
			expect(caseRow.rows[0]).toMatchObject({
				status: "RESOLVED",
				disposition: "STATUS_ALIGNED",
			});
		});
	});

	test("G3-EX-S4-05: FILL_MISSING opens reconciliation case on reconcile without correlation", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId } = await openSession(deps, pool);

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "2.0",
				price: "25.0",
				deferFill: true,
				simulateDispatchTimeout: true,
			});

			const reconciled = await reconcileUnknownDispatch(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
				decision: "CONFIRM_EXISTING",
				rationale: "no fill evidence found yet",
			});

			expect(reconciled.venueDispatchStatus).toBe("RECONCILING");
			expect(reconciled.reconciliationCaseId).toMatch(/^ex_rc_/);

			const caseRow = await pool.query(
				`SELECT case_kind, status FROM execution_reconciliation_cases WHERE id = $1`,
				[reconciled.reconciliationCaseId],
			);
			expect(caseRow.rows[0]).toMatchObject({
				case_kind: "FILL_MISSING",
				status: "OPEN",
			});
		});
	});

	test("G3-EX-S4-06: cross-tenant commandId replay on openVenueReconciliationCase → EX_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId, venueAdapterRefId } = await openSession(deps, pool);

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				deferFill: true,
			});

			const commandId = randomUUID();
			await openVenueReconciliationCase(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				caseKind: "ORDER_STATUS_MISMATCH",
				orderId: submitted.orderId!,
				venueAdapterRefId,
			});

			await expect(
				openVenueReconciliationCase(deps, {
					commandId,
					organizationId: EXECUTION_TEST_ORG_B,
					caseKind: "ORDER_STATUS_MISMATCH",
					orderId: submitted.orderId!,
					venueAdapterRefId,
				}),
			).rejects.toMatchObject({ code: "EX_CROSS_TENANT" });

			const orgBCases = await pool.query(
				`SELECT id FROM execution_reconciliation_cases WHERE organization_id = $1`,
				[EXECUTION_TEST_ORG_B],
			);
			expect(orgBCases.rowCount).toBe(0);
		});
	});

	test("G3-EX-S4-07: cross-tenant commandId replay on reconcileUnknownDispatch → EX_CROSS_TENANT", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withExecutionPgHarness(async ({ pool }) => {
			const deps = createDeps(pool);
			const { sessionId } = await openSession(deps, pool);

			const submitted = await submitOrder(deps, {
				commandId: randomUUID(),
				organizationId: EXECUTION_TEST_ORG_ID,
				sessionId,
				clientOrderId: `client-${randomUUID()}`,
				instrumentId: EXECUTION_TEST_INSTRUMENT_ID,
				side: "BUY",
				quantity: "1.0",
				price: "100.0",
				deferFill: true,
				simulateDispatchTimeout: true,
			});

			const commandId = randomUUID();
			await reconcileUnknownDispatch(deps, {
				commandId,
				organizationId: EXECUTION_TEST_ORG_ID,
				orderId: submitted.orderId!,
				decision: "MARK_FAILED",
				rationale: "venue lost order",
			});

			await expect(
				reconcileUnknownDispatch(deps, {
					commandId,
					organizationId: EXECUTION_TEST_ORG_B,
					orderId: submitted.orderId!,
					decision: "MARK_FAILED",
					rationale: "cross tenant replay",
				}),
			).rejects.toMatchObject({ code: "EX_CROSS_TENANT" });

			const orderRow = await pool.query(
				`SELECT venue_dispatch_status FROM execution_orders WHERE id = $1`,
				[submitted.orderId],
			);
			expect(orderRow.rows[0]?.venue_dispatch_status).toBe("FAILED");
		});
	});
});
