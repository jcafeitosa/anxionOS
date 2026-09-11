import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	assertPortfoliosExecutionModeSupported,
	PORTFOLIOS_EVENT_TYPES,
	PortfoliosContractError,
} from "@anxionos/contracts/portfolios";
import {
	applyFillToPosition,
	createPgCommandJournalRepository,
	createPortfolio,
	createPortfoliosUnitOfWork,
} from "@anxionos/portfolios";
import {
	applyTestFill,
	buildPortfoliosFillConfirmedFixture,
	createPortfoliosFillConsumer,
	PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
	PORTFOLIOS_TEST_INSTRUMENT_ID,
	PORTFOLIOS_TEST_ORG_ID,
	PORTFOLIOS_TEST_OWNER_USER_ID,
	seedSimulatedPortfolio,
	shouldRunPgIntegrationTests,
	withPortfoliosPgHarness,
} from "../test-support";

describe("portfolios lifecycle commands (ANX-153 S2)", () => {
	test("createPortfolio emits portfolios.portfolio.created.v1 atomically", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const commandId = randomUUID();

			const result = await createPortfolio(
				{ unitOfWork, commandJournal },
				{
					commandId,
					organizationId: PORTFOLIOS_TEST_ORG_ID,
					ownerUserId: PORTFOLIOS_TEST_OWNER_USER_ID,
					capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
					name: "Lifecycle Portfolio",
					baseCurrency: "USD",
					executionMode: "SIMULATED",
				},
			);

			expect(result.portfolioId).toMatch(/^pf_prt_/);

			const journalRows = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'portfolios'
				 ORDER BY occurred_at`,
			);
			expect(journalRows.rowCount).toBe(1);
			expect(journalRows.rows[0]?.event_type).toBe(
				PORTFOLIOS_EVENT_TYPES.PORTFOLIO_CREATED,
			);
			expect(journalRows.rows[0]?.payload).toMatchObject({
				portfolioId: result.portfolioId,
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				executionMode: "SIMULATED",
			});

			const outboxRows = await pool.query(
				`SELECT status FROM outbox WHERE owner_domain = 'portfolios'`,
			);
			expect(outboxRows.rowCount).toBe(1);
			expect(outboxRows.rows[0]?.status).toBe("pending");
		});
	});

	test("G3-PF-S2-01: applyFillToPosition updates quantity and emits position.updated", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const fillId = `fill_${randomUUID()}`;

			const applied = await applyTestFill(pool, {
				portfolioId: seeded.portfolioId,
				fillId,
				quantity: "3.5",
				price: "100.0",
			});

			expect(applied.positionId).toMatch(/^pf_pos_/);
			expect(applied.holdingId).toMatch(/^pf_hld_/);

			const positionRow = await pool.query(
				`SELECT quantity, revision FROM portfolios_positions WHERE id = $1`,
				[applied.positionId],
			);
			expect(Number(positionRow.rows[0]?.quantity)).toBe(3.5);
			expect(positionRow.rows[0]?.revision).toBe(1);

			const holdingCount = await pool.query(
				`SELECT count(*)::int AS c FROM portfolios_holdings WHERE fill_id = $1`,
				[fillId],
			);
			expect(holdingCount.rows[0]?.c).toBe(1);

			const updatedEvents = await pool.query(
				`SELECT event_type, payload
				 FROM domain_journal
				 WHERE owner_domain = 'portfolios'
				   AND event_type = $1
				 ORDER BY occurred_at`,
				[PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED],
			);
			expect(updatedEvents.rowCount).toBe(2);
			const payload = updatedEvents.rows.find(
				(row) =>
					(row.payload as Record<string, unknown>).instrumentId ===
					PORTFOLIOS_TEST_INSTRUMENT_ID,
			)?.payload as Record<string, unknown>;
			expect(payload).toMatchObject({
				portfolioId: seeded.portfolioId,
				positionId: applied.positionId,
				fillId,
				side: "BUY",
				instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
				positionSide: "LONG",
				book: "TRADING",
			});
			expect(Number(payload.quantity)).toBe(3.5);
		});
	});

	test("G3-PF-S2-02: duplicate fill idempotency returns same revision without double holding", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const fillId = `fill_dup_${randomUUID()}`;
			const command = {
				commandId: randomUUID(),
				organizationId: PORTFOLIOS_TEST_ORG_ID,
				portfolioId: seeded.portfolioId,
				fillId,
				instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
				side: "BUY" as const,
				quantity: "1.0",
				price: "10.0",
				executionMode: "SIMULATED" as const,
				idempotencyKey: `fill:${fillId}`,
			};

			const first = await applyFillToPosition(
				{ unitOfWork, commandJournal },
				command,
			);
			const second = await applyFillToPosition(
				{ unitOfWork, commandJournal },
				{ ...command, commandId: randomUUID() },
			);

			expect(second.idempotentReplay).toBe(true);
			expect(second.positionId).toBe(first.positionId);
			expect(second.holdingId).toBe(first.holdingId);
			expect(second.revision).toBe(first.revision);

			const holdingCount = await pool.query(
				`SELECT count(*)::int AS c FROM portfolios_holdings WHERE fill_id = $1`,
				[fillId],
			);
			expect(holdingCount.rows[0]?.c).toBe(1);

			const positionRow = await pool.query(
				`SELECT quantity, revision FROM portfolios_positions WHERE id = $1`,
				[first.positionId],
			);
			expect(Number(positionRow.rows[0]?.quantity)).toBe(1);
			expect(positionRow.rows[0]?.revision).toBe(first.revision);
		});
	});

	test("G3-PF-S2-04: REAL mode reject on createPortfolio and applyFillToPosition", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		expect(() => assertPortfoliosExecutionModeSupported("REAL")).toThrow(
			PortfoliosContractError,
		);
		expect(() => assertPortfoliosExecutionModeSupported("LIVE")).toThrow(
			PortfoliosContractError,
		);

		await withPortfoliosPgHarness(async ({ pool }) => {
			const unitOfWork = createPortfoliosUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const seeded = await seedSimulatedPortfolio(pool);

			await expect(
				createPortfolio(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: PORTFOLIOS_TEST_ORG_ID,
						ownerUserId: PORTFOLIOS_TEST_OWNER_USER_ID,
						capitalAccountId: PORTFOLIOS_TEST_CAPITAL_ACCOUNT_ID,
						name: "REAL Portfolio",
						baseCurrency: "USD",
						executionMode: "REAL" as "SIMULATED",
					},
				),
			).rejects.toThrow();

			await expect(
				applyFillToPosition(
					{ unitOfWork, commandJournal },
					{
						commandId: randomUUID(),
						organizationId: PORTFOLIOS_TEST_ORG_ID,
						portfolioId: seeded.portfolioId,
						fillId: `fill_real_${randomUUID()}`,
						instrumentId: PORTFOLIOS_TEST_INSTRUMENT_ID,
						side: "BUY",
						quantity: "1.0",
						price: "10.0",
						executionMode: "REAL" as "SIMULATED",
						idempotencyKey: "fill:real",
					},
				),
			).rejects.toThrow();

			const portfolioCount = await pool.query(
				`SELECT count(*)::int AS c FROM portfolios_portfolios WHERE name = 'REAL Portfolio'`,
			);
			expect(portfolioCount.rows[0]?.c).toBe(0);
		});
	});

	test("fill-confirmed consumer applies fill and emits portfolios.position.updated.v1", async () => {
		if (!shouldRunPgIntegrationTests()) return;

		await withPortfoliosPgHarness(async ({ pool }) => {
			const seeded = await seedSimulatedPortfolio(pool);
			const consumer = createPortfoliosFillConsumer(pool);
			const fillId = `fill_consumer_${randomUUID()}`;
			const fill = buildPortfoliosFillConfirmedFixture({
				portfolioId: seeded.portfolioId,
				fillId,
				quantity: "4.0",
				price: "25.0",
			});

			const result = await consumer.handle(fill);
			expect(result.positionId).toMatch(/^pf_pos_/);
			expect(result.holdingId).toMatch(/^pf_hld_/);

			const positionRow = await pool.query(
				`SELECT quantity FROM portfolios_positions WHERE id = $1`,
				[result.positionId],
			);
			expect(Number(positionRow.rows[0]?.quantity)).toBe(4);

			const updatedEvents = await pool.query(
				`SELECT payload FROM domain_journal
				 WHERE owner_domain = 'portfolios'
				   AND event_type = $1
				 ORDER BY occurred_at`,
				[PORTFOLIOS_EVENT_TYPES.POSITION_UPDATED],
			);
			expect(updatedEvents.rowCount).toBe(2);
			const payload = updatedEvents.rows.find(
				(row) =>
					(row.payload as Record<string, unknown>).positionId ===
					result.positionId,
			)?.payload as Record<string, unknown>;
			expect(payload).toMatchObject({
				fillId,
				portfolioId: seeded.portfolioId,
				positionId: result.positionId,
				side: "BUY",
			});
			expect(Number(payload.quantity)).toBe(4);

			const replay = await consumer.handle(fill);
			expect(replay.idempotentReplay).toBe(true);
			expect(replay.holdingId).toBe(result.holdingId);
		});
	});
});
