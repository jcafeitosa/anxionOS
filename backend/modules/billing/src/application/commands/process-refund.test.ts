import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { BILLING_EVENT_TYPES } from "@anxionos/contracts/billing";
import { processRefund } from "./process-refund";
import { BillingCommandError } from "../errors";
import {
	createBillingTestUow,
	TEST_ORG,
	testInvoiceId,
	testSubscriptionId,
} from "./billing-test-support";

const SUBSCRIPTION_ID = testSubscriptionId();
const INVOICE_ID = testInvoiceId();

describe("processRefund", () => {
	test("refunds issued invoice and publishes event", async () => {
		const { unitOfWork, commandJournal, getInvoices, getPublished } =
			createBillingTestUow({
				subscriptions: [
					{
						id: SUBSCRIPTION_ID,
						organizationId: TEST_ORG,
						planCode: "pro",
						billingPeriodStart: "2026-09-01T00:00:00.000Z",
						billingPeriodEnd: "2026-10-01T00:00:00.000Z",
						status: "ACTIVE",
					},
				],
				invoices: [
					{
						id: INVOICE_ID,
						organizationId: TEST_ORG,
						subscriptionId: SUBSCRIPTION_ID,
						billingPeriod: "2026-09",
						status: "ISSUED",
						totalAmount: "59.00",
						issuedAt: "2026-09-05T00:00:00.000Z",
					},
				],
			});

		const result = await processRefund(
			{ unitOfWork, commandJournal },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				subscriptionId: SUBSCRIPTION_ID,
				invoiceId: INVOICE_ID,
				refundAmount: "59.00",
				refundedAt: "2026-09-10T12:00:00.000Z",
			},
		);

		expect(result.invoiceId).toBe(INVOICE_ID);
		expect(getInvoices().get(INVOICE_ID)?.status).toBe("REFUNDED");
		expect(getPublished()[0]?.eventType).toBe(
			BILLING_EVENT_TYPES.INVOICE_REFUNDED,
		);
	});

	test("rejects refund on draft invoice", async () => {
		const { unitOfWork, commandJournal } = createBillingTestUow({
			subscriptions: [
				{
					id: SUBSCRIPTION_ID,
					organizationId: TEST_ORG,
					planCode: "pro",
					billingPeriodStart: "2026-09-01T00:00:00.000Z",
					billingPeriodEnd: "2026-10-01T00:00:00.000Z",
					status: "ACTIVE",
				},
			],
			invoices: [
				{
					id: INVOICE_ID,
					organizationId: TEST_ORG,
					subscriptionId: SUBSCRIPTION_ID,
					billingPeriod: "2026-09",
					status: "DRAFT",
					totalAmount: "59.00",
					issuedAt: null,
				},
			],
		});

		await expect(
			processRefund(
				{ unitOfWork, commandJournal },
				{
					commandId: randomUUID(),
					organizationId: TEST_ORG,
					subscriptionId: SUBSCRIPTION_ID,
					invoiceId: INVOICE_ID,
					refundAmount: "59.00",
					refundedAt: "2026-09-10T12:00:00.000Z",
				},
			),
		).rejects.toBeInstanceOf(BillingCommandError);
	});
});
