import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { BILLING_EVENT_TYPES } from "@anxionos/contracts/billing";
import {
	billingInvoicePaidBridgeSchema,
	billingRefundProcessedBridgeSchema,
} from "@anxionos/contracts/partners";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import {
	createPgCommandJournalRepository as createBillingJournal,
	createBillingUnitOfWork,
	processBillingWebhook,
	processRefund,
} from "../../modules/billing/src";
import { ensureBillingSchema } from "../../modules/billing/src/infrastructure/migrate";
import {
	accrueCommissionFromInvoice,
	approvePayout,
	createInvoicePaidConsumer,
	createPartnersUnitOfWork,
	createRefundProcessedConsumer,
	failPayout,
	registerPartner,
	requestPayout,
	retryPayout,
	reversePayout,
	settlePayout,
} from "../../modules/partners/src";
import { ensurePartnersSchema } from "../../modules/partners/src/infrastructure/migrate";
import { createPgCommandJournalRepository as createPartnersJournal } from "../../modules/partners/src/infrastructure/persistence/command-journal-repository";
import {
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

const ALL_P07_TABLES =
	"TRUNCATE billing_command_journal, billing_invoice_lines, billing_usage_aggregations, billing_invoices, billing_subscriptions, partners_command_journal, partners_payouts, partners_commission_accruals, partners_partners, domain_journal, outbox CASCADE";

describe("partners paid/refund flow against real PostgreSQL", () => {
	test("issued alone does not accrue; paid accrues and refund reverses once", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = process.env.DATABASE_URL?.trim();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureEventingSchema(pool);
			await ensureBillingSchema(pool);
			await ensurePartnersSchema(pool);
			await truncateDomainTables(pool, ALL_P07_TABLES);
			const billingUnitOfWork = createBillingUnitOfWork(pool);
			const billingJournal = createBillingJournal(pool);
			const partnersUnitOfWork = createPartnersUnitOfWork(pool);
			const partnersJournal = createPartnersJournal(pool);
			const organizationId = randomUUID();
			const partnerOrganizationId = randomUUID();
			const subscriptionId = `bil_sub_${randomUUID()}`;
			const invoiceId = `bil_inv_${randomUUID()}`;
			const commandId = randomUUID();
			await pool.query(
				`INSERT INTO billing_subscriptions
				 (id, organization_id, plan_code, billing_period_start, billing_period_end, status)
				 VALUES ($1, $2, 'pro', $3, $4, 'ACTIVE')`,
				[
					subscriptionId,
					organizationId,
					"2026-09-01T00:00:00.000Z",
					"2026-10-01T00:00:00.000Z",
				],
			);
			await pool.query(
				`INSERT INTO billing_invoices
				 (id, organization_id, subscription_id, billing_period, status, total_amount, issued_at)
				 VALUES ($1, $2, $3, '2026-09', 'ISSUED', '1000', $4)`,
				[invoiceId, organizationId, subscriptionId, "2026-09-01T00:00:00.000Z"],
			);
			await registerPartner(
				{ unitOfWork: partnersUnitOfWork, commandJournal: partnersJournal },
				{
					commandId: randomUUID(),
					organizationId: partnerOrganizationId,
					referralCode: `REF-PG-${randomUUID()}`,
					displayName: "PG Paid Partner",
					commissionRate: "10",
					referredOrganizationId: organizationId,
				},
			);

			const issuedOnly = await pool.query(
				"SELECT count(*)::int AS count FROM partners_commission_accruals",
			);
			expect(issuedOnly.rows[0]?.count).toBe(0);

			await processBillingWebhook(
				{ unitOfWork: billingUnitOfWork, commandJournal: billingJournal },
				{
					commandId,
					organizationId,
					webhookEventId: `evt_${randomUUID()}`,
					eventType: "invoice.payment_succeeded",
					occurredAt: "2026-09-10T12:00:00.000Z",
					subscriptionId,
					invoiceId,
				},
			);
			const paidRow = await pool.query(
				"SELECT payload FROM domain_journal WHERE event_type = $1 ORDER BY recorded_at DESC LIMIT 1",
				[BILLING_EVENT_TYPES.INVOICE_PAID],
			);
			const paid = billingInvoicePaidBridgeSchema.parse(
				paidRow.rows[0]?.payload,
			);
			const paidConsumer = createInvoicePaidConsumer({
				unitOfWork: partnersUnitOfWork,
				commandJournal: partnersJournal,
			});
			const accrued = await paidConsumer.handle(paid, partnerOrganizationId);
			const paidReplay = await paidConsumer.handle(paid, partnerOrganizationId);
			expect(accrued.commissionAmount).toBe("100");
			expect(paidReplay.idempotentReplay).toBe(true);
			expect(
				(
					await pool.query(
						"SELECT count(*)::int AS count FROM partners_commission_accruals",
					)
				).rows[0]?.count,
			).toBe(1);

			await processRefund(
				{ unitOfWork: billingUnitOfWork, commandJournal: billingJournal },
				{
					commandId: randomUUID(),
					organizationId,
					subscriptionId,
					invoiceId,
					refundAmount: "1000",
					refundedAt: "2026-09-11T12:00:00.000Z",
				},
			);
			const refundRow = await pool.query(
				"SELECT payload FROM domain_journal WHERE event_type = $1 ORDER BY recorded_at DESC LIMIT 1",
				[BILLING_EVENT_TYPES.REFUND_PROCESSED],
			);
			const refund = billingRefundProcessedBridgeSchema.parse(
				refundRow.rows[0]?.payload,
			);
			const refundConsumer = createRefundProcessedConsumer({
				unitOfWork: partnersUnitOfWork,
				commandJournal: partnersJournal,
			});
			const reversed = await refundConsumer.handle(
				refund,
				partnerOrganizationId,
			);
			const reversalReplay = await refundConsumer.handle(
				refund,
				partnerOrganizationId,
			);
			expect(reversed.commissionAccrualId).toBe(accrued.commissionAccrualId);
			expect(reversalReplay.idempotentReplay).toBe(true);
		} finally {
			await pool.end();
		}
	});

	test("payout lifecycle persists transitions and retry without duplicate effects", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = process.env.DATABASE_URL?.trim();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureEventingSchema(pool);
			await ensurePartnersSchema(pool);
			await truncateDomainTables(pool, ALL_P07_TABLES);
			const unitOfWork = createPartnersUnitOfWork(pool);
			const commandJournal = createPartnersJournal(pool);
			const organizationId = randomUUID();
			const referredOrganizationId = randomUUID();
			const registered = await registerPartner(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					referralCode: `REF-PAYOUT-${randomUUID()}`,
					displayName: "PG Payout Partner",
					commissionRate: "10",
					referredOrganizationId,
				},
			);
			await accrueCommissionFromInvoice(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					invoiceId: `bil_inv_${randomUUID()}`,
					referredOrganizationId,
					subscriptionId: `bil_sub_${randomUUID()}`,
					billingPeriod: "2026-09",
					totalAmount: "200",
					paidAt: "2026-09-10T12:00:00.000Z",
				},
			);
			const requested = await requestPayout(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					partnerId: registered.partnerId!,
					requestedAt: "2026-09-12T12:00:00.000Z",
				},
			);
			const processing = await approvePayout(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					payoutId: requested.payoutId!,
					approvedAt: "2026-09-13T12:00:00.000Z",
					approvalReference: "APPR-PG",
				},
			);
			const failed = await failPayout(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					payoutId: requested.payoutId!,
					failedAt: "2026-09-13T12:01:00.000Z",
					failureReason: "SIMULATED_FAILURE",
				},
			);
			const retry = await retryPayout(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					payoutId: requested.payoutId!,
					processingAt: "2026-09-13T12:02:00.000Z",
				},
			);
			const settled = await settlePayout(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					payoutId: requested.payoutId!,
					settledAt: "2026-09-13T12:03:00.000Z",
					providerReference: "SIM-PG-001",
				},
			);
			const reversed = await reversePayout(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					partnerOrganizationId: organizationId,
					payoutId: requested.payoutId!,
					reversedAt: "2026-09-14T12:00:00.000Z",
					reversalReference: "SIM-REFUND-001",
				},
			);
			const row = await pool.query(
				"SELECT status, attempt_count, provider_reference FROM partners_payouts WHERE id = $1 AND partner_organization_id = $2",
				[requested.payoutId, organizationId],
			);
			const events = await pool.query(
				"SELECT event_type FROM domain_journal WHERE payload->>'payoutId' = $1 ORDER BY recorded_at ASC",
				[requested.payoutId],
			);
			expect(processing.payoutStatus).toBe("PROCESSING");
			expect(failed.payoutStatus).toBe("FAILED");
			expect(retry.payoutStatus).toBe("PROCESSING");
			expect(settled.payoutStatus).toBe("SETTLED");
			expect(reversed.payoutStatus).toBe("REVERSED");
			expect(row.rows[0]).toMatchObject({
				status: "REVERSED",
				attempt_count: 2,
				provider_reference: "SIM-PG-001",
			});
			expect(events.rows.map((event) => event.event_type)).toEqual([
				"partners.payout.scheduled.v1",
				"partners.payout.processing.v1",
				"partners.payout.failed.v1",
				"partners.payout.processing.v1",
				"partners.payout.settled.v1",
				"partners.payout.reversed.v1",
			]);
		} finally {
			await pool.end();
		}
	});
});
