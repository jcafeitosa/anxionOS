import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createBillingUnitOfWork,
	createPgCommandJournalRepository,
	ensureBillingSchema,
	processBillingWebhook,
	processRefund,
} from "@anxionos/billing";
import { createPgPool } from "@anxionos/eventing/postgres";
import {
	getDatabaseUrl,
	shouldRunPgIntegrationTests,
	truncateDomainTables,
} from "../pg-harness-guard";

/**
 * ANX-470 — prova de aderencia codigo<->DDL do modulo billing: as 5 tabelas
 * sao exercitadas pelos repositorios/comandos REAIS contra o schema real.
 */
describe("billing schema adherence (ANX-470)", () => {
	test("repositories exercise all billing tables on the real schema", async () => {
		if (!shouldRunPgIntegrationTests()) return;
		const url = getDatabaseUrl();
		if (!url) return;
		const pool = createPgPool(url);
		try {
			await ensureBillingSchema(pool);
			await truncateDomainTables(
				pool,
				"TRUNCATE billing_subscriptions, billing_invoices, billing_invoice_lines, billing_usage_aggregations, billing_command_journal RESTART IDENTITY CASCADE",
			);
			const unitOfWork = createBillingUnitOfWork(pool);
			const commandJournal = createPgCommandJournalRepository(pool);
			const organizationId = randomUUID();
			const subscriptionId = `bil_sub_${randomUUID()}`;
			const invoiceId = `bil_inv_${randomUUID()}`;

			await unitOfWork.runInTransaction(async (ctx) => {
				await ctx.subscriptions.save({
					id: subscriptionId,
					organizationId,
					planCode: "trader",
					billingPeriodStart: new Date().toISOString(),
					billingPeriodEnd: new Date().toISOString(),
					status: "ACTIVE",
				});
				await ctx.invoices.save({
					id: invoiceId,
					organizationId,
					subscriptionId,
					billingPeriod: "2026-09",
					status: "ISSUED",
					totalAmount: "1.00",
					issuedAt: new Date().toISOString(),
				});
				await ctx.usageAggregations.save({
					id: randomUUID(),
					organizationId,
					subscriptionId,
					usageRecordId: `ur_${randomUUID()}`,
					billingPeriod: "2026-09",
					quantity: "10",
					unit: "requests",
					unitPrice: "0.10",
					amount: "1.00",
					consumerKind: "agent",
				});
			});

			await processBillingWebhook(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					webhookEventId: `evt_${randomUUID()}`,
					eventType: "invoice.payment_succeeded",
					occurredAt: new Date().toISOString(),
					subscriptionId,
					invoiceId,
				},
			);
			const refund = await processRefund(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId,
					subscriptionId,
					invoiceId,
					refundAmount: "1.00",
					refundedAt: new Date().toISOString(),
					reason: "adherence test",
				},
			);
			expect(refund).toBeDefined();
		} finally {
			await pool.end();
		}
	});
});
