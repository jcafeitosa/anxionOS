/**
 * ANX-163 P06 Slice S4 — Full PG pipeline E2E (STOCK + CRYPTO, PAPER)
 *
 * Proves the complete cross-module lifecycle with seeded grantId/correlationId:
 *   decisions → risk → capital → execution → accounting → performance
 *
 * Reuses p06-integration/test-support.ts (fixtures scope, ANX-163).
 */
import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	checkAuthority,
	proposeDecision,
	submitIntent,
} from "@anxionos/decisions";
import {
	createExecutionUnitOfWork,
	createPgCommandJournalRepository as createExecutionCommandJournal,
	createPgRiskPermitValidationPort,
	InMemoryExecutionCapitalNotifyAdapter,
	openExecutionSession,
	SimulatedVenueAdapter,
	submitOrder,
} from "@anxionos/execution";
import {
	postTradeFill,
	createAccountingUnitOfWork,
	createPgCommandJournalRepository as createAccountingCommandJournal,
} from "@anxionos/accounting";
import { buildTradeFillLines } from "../../modules/accounting/src/application/commands/post-trade-fill";
import {
	recordOutcomeSnapshot,
	createPerformanceUnitOfWork,
	createPgCommandJournalRepository as createPerformanceCommandJournal,
	OFFICIAL_LEDGER_PNL_METRICS,
} from "@anxionos/performance";
import {
	createP06DecisionsDeps,
	fulfillP06SubmitPreconditions,
	P06_CRYPTO_INSTRUMENT_ID,
	P06_CRYPTO_INTENT_HASH,
	P06_STOCK_INSTRUMENT_ID,
	P06_STOCK_INTENT_HASH,
	P06_TEST_AUTHORITY_EPOCH,
	P06_TEST_CORRELATION_ID,
	P06_TEST_GRANT_ID,
	P06_TEST_ORG_ID,
	P06_TEST_RISK_EPOCH,
	seedP06CapitalAccount,
	seedP06RiskPermit,
	shouldRunP06PgIntegrationTests,
	withP06PgHarness,
} from "./test-support";

interface PipelineLeg {
	label: "STOCK" | "CRYPTO";
	intentHash: string;
	instrumentId: string;
	quantity: string;
	price: string;
	notionalAmount: string;
	feeAmount: string;
	clientOrderId: string;
}

const PIPELINE_LEGS: PipelineLeg[] = [
	{
		label: "STOCK",
		intentHash: P06_STOCK_INTENT_HASH,
		instrumentId: P06_STOCK_INSTRUMENT_ID,
		quantity: "10",
		price: "150.00",
		notionalAmount: "1500.00",
		feeAmount: "2.50",
		clientOrderId: "cli_aapl_p06_full",
	},
	{
		label: "CRYPTO",
		intentHash: P06_CRYPTO_INTENT_HASH,
		instrumentId: P06_CRYPTO_INSTRUMENT_ID,
		quantity: "0.5",
		price: "50000.00",
		notionalAmount: "25000.00",
		feeAmount: "12.50",
		clientOrderId: "cli_btc_p06_full",
	},
];

describe("P06 paper flow — full PG pipeline STOCK+CRYPTO (ANX-163 S4)", () => {
	test("real PG: decisions → risk → capital → execution → accounting → performance", async () => {
		if (!shouldRunP06PgIntegrationTests()) {
			console.log(
				"⚠ Skipping P06 full pipeline: set RUN_PG_INTEGRATION_TESTS=true and DATABASE_URL",
			);
			return;
		}

		await withP06PgHarness(async ({ pool }) => {
			const decisionsDeps = createP06DecisionsDeps(pool);
			const executionDeps = {
				unitOfWork: createExecutionUnitOfWork(pool),
				commandJournal: createExecutionCommandJournal(pool),
				riskPermitValidation: createPgRiskPermitValidationPort(pool),
				simulatedVenueAdapter: new SimulatedVenueAdapter(),
				capitalNotify: new InMemoryExecutionCapitalNotifyAdapter(),
			};
			const accountingDeps = {
				unitOfWork: createAccountingUnitOfWork(pool),
				commandJournal: createAccountingCommandJournal(pool),
			};
			const performanceDeps = {
				unitOfWork: createPerformanceUnitOfWork(pool),
				commandJournal: createPerformanceCommandJournal(pool),
			};

			const accountId = await seedP06CapitalAccount(pool, "PAPER");
			const outcomes: Array<{ label: string; outcomeSnapshotId: string }> = [];

			for (const leg of PIPELINE_LEGS) {
				const proposed = await proposeDecision(decisionsDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					grantId: P06_TEST_GRANT_ID,
					expectedAuthorityEpoch: P06_TEST_AUTHORITY_EPOCH,
					correlationId: P06_TEST_CORRELATION_ID,
					proposalKind: "TRADE",
				});
				expect(proposed.decisionId).toMatch(/^dc_dec_/);

				const checked = await checkAuthority(decisionsDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					decisionId: proposed.decisionId!,
					grantId: P06_TEST_GRANT_ID,
					authorityEpoch: P06_TEST_AUTHORITY_EPOCH,
					intentHash: leg.intentHash,
				});
				expect(checked.revision).toBe(2);

				const preconditions = await fulfillP06SubmitPreconditions(pool, {
					grantId: P06_TEST_GRANT_ID,
					intentHash: leg.intentHash,
					accountId,
					notionalAmount: leg.notionalAmount,
					executionMode: "PAPER",
				});
				decisionsDeps.capitalReservationQuery =
					preconditions.capitalReservationQuery;

				const submitted = await submitIntent(decisionsDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					decisionId: proposed.decisionId!,
					intentHash: leg.intentHash,
					instrumentId: leg.instrumentId,
					side: "BUY",
					quantity: leg.quantity,
					price: leg.price,
					executionMode: "PAPER",
				});
				expect(submitted.intentId).toMatch(/^dc_int_/);

				const riskPermitId = await seedP06RiskPermit(pool, {
					intentHash: leg.intentHash,
					notionalAmount: leg.notionalAmount,
					executionMode: "PAPER",
				});

				const opened = await openExecutionSession(executionDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					intentHash: leg.intentHash,
					riskPermitId,
					authorityEpoch: P06_TEST_AUTHORITY_EPOCH,
					riskEpoch: P06_TEST_RISK_EPOCH,
					executionMode: "PAPER",
				});
				expect(opened.sessionId).toMatch(/^ex_ses_/);

				const order = await submitOrder(executionDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					sessionId: opened.sessionId!,
					clientOrderId: leg.clientOrderId,
					instrumentId: leg.instrumentId,
					side: "BUY",
					quantity: leg.quantity,
					price: leg.price,
					asset: "USD",
				});
				expect(order.orderId).toMatch(/^ex_ord_/);
				expect(order.fillId).toMatch(/^ex_fill_/);

				const accountingOrderRef = randomUUID();

				const ledger = await postTradeFill(accountingDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					fillId: order.fillId!,
					orderId: accountingOrderRef,
					side: "BUY",
					asset: "USD",
					notionalAmount: leg.notionalAmount,
					executionMode: "PAPER",
					idempotencyKey: `idem-p06-full-${leg.label.toLowerCase()}`,
					feeAmount: leg.feeAmount,
					feeAsset: "USD",
				});
				expect(ledger.entryId).toMatch(/^acc_je_/);

				const fillLines = buildTradeFillLines({
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					fillId: order.fillId!,
					orderId: accountingOrderRef,
					side: "BUY",
					asset: "USD",
					notionalAmount: leg.notionalAmount,
					executionMode: "PAPER",
					idempotencyKey: `idem-p06-full-${leg.label.toLowerCase()}`,
					feeAmount: leg.feeAmount,
					feeAsset: "USD",
				});

				const outcome = await recordOutcomeSnapshot(performanceDeps, {
					commandId: randomUUID(),
					organizationId: P06_TEST_ORG_ID,
					journalEntryId: ledger.entryId!,
					valueDate: new Date().toISOString().slice(0, 10),
					linesSummary: fillLines,
				});
				expect(outcome.outcomeSnapshotId).toMatch(/^perf_out_/);
				outcomes.push({
					label: leg.label,
					outcomeSnapshotId: outcome.outcomeSnapshotId!,
				});

				const metrics = await pool.query<{ metric_name: string }>(
					`SELECT metric_name
					 FROM performance_metric_series
					 WHERE outcome_snapshot_id = $1
					 ORDER BY metric_name`,
					[outcome.outcomeSnapshotId],
				);
				expect(metrics.rowCount).toBe(3);
				const metricNames = metrics.rows.map((row) => row.metric_name);
				expect(metricNames).toContain(OFFICIAL_LEDGER_PNL_METRICS.FEES_TOTAL);
				expect(metricNames).toContain(
					OFFICIAL_LEDGER_PNL_METRICS.NOTIONAL_TOTAL,
				);
				expect(metricNames).toContain(
					OFFICIAL_LEDGER_PNL_METRICS.CASH_NET_DELTA,
				);
			}

			expect(outcomes).toHaveLength(2);
			expect(outcomes[0]?.outcomeSnapshotId).not.toBe(
				outcomes[1]?.outcomeSnapshotId,
			);

			const decisionCount = await pool.query<{ count: number }>(
				`SELECT COUNT(*)::int AS count FROM decisions_records WHERE organization_id = $1`,
				[P06_TEST_ORG_ID],
			);
			expect(decisionCount.rows[0]?.count).toBe(2);

			const sessionCount = await pool.query<{ count: number }>(
				`SELECT COUNT(*)::int AS count FROM execution_sessions WHERE organization_id = $1`,
				[P06_TEST_ORG_ID],
			);
			expect(sessionCount.rows[0]?.count).toBe(2);
		});
	});
});
