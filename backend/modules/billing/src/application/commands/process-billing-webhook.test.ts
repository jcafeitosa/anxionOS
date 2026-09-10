import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { BILLING_EVENT_TYPES } from "@anxionos/contracts/billing";
import { processBillingWebhook } from "./process-billing-webhook";
import {
	createBillingTestUow,
	TEST_ORG,
	testInvoiceId,
	testSubscriptionId,
} from "./billing-test-support";

const SUBSCRIPTION_ID = testSubscriptionId();
const INVOICE_ID = testInvoiceId();
const WEBHOOK_EVENT_ID = `evt_${randomUUID()}`;

describe("processBillingWebhook", () => {
	test("duplicate webhookEventId is idempotent", async () => {
		const { unitOfWork, commandJournal } = createBillingTestUow({
			subscriptions: [
				{
					id: SUBSCRIPTION_ID,
					organizationId: TEST_ORG,
					planCode: "trader",
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
					totalAmount: "19.00",
					issuedAt: "2026-09-01T00:00:00.000Z",
				},
			],
		});

		const baseInput = {
			commandId: randomUUID(),
			organizationId: TEST_ORG,
			webhookEventId: WEBHOOK_EVENT_ID,
			eventType: "invoice.payment_succeeded" as const,
			occurredAt: "2026-09-10T12:00:00.000Z",
			subscriptionId: SUBSCRIPTION_ID,
			invoiceId: INVOICE_ID,
		};

		await processBillingWebhook({ unitOfWork, commandJournal }, baseInput);
		const replay = await processBillingWebhook(
			{ unitOfWork, commandJournal },
			{
				...baseInput,
				commandId: randomUUID(),
			},
		);

		expect(replay.idempotentReplay).toBe(true);
	});

	test("subscription.cancelled webhook cancels subscription", async () => {
		const { unitOfWork, commandJournal, getSubscriptions, getPublished } =
			createBillingTestUow({
				subscriptions: [
					{
						id: SUBSCRIPTION_ID,
						organizationId: TEST_ORG,
						planCode: "beginner",
						billingPeriodStart: "2026-09-01T00:00:00.000Z",
						billingPeriodEnd: "2026-10-01T00:00:00.000Z",
						status: "ACTIVE",
					},
				],
			});

		await processBillingWebhook(
			{ unitOfWork, commandJournal },
			{
				commandId: randomUUID(),
				organizationId: TEST_ORG,
				webhookEventId: `evt_${randomUUID()}`,
				eventType: "subscription.cancelled",
				occurredAt: "2026-09-10T12:00:00.000Z",
				subscriptionId: SUBSCRIPTION_ID,
			},
		);

		expect(getSubscriptions().get(SUBSCRIPTION_ID)?.status).toBe("CANCELLED");
		expect(
			getPublished().some(
				(event) =>
					event.eventType === BILLING_EVENT_TYPES.SUBSCRIPTION_CANCELLED,
			),
		).toBe(true);
		expect(
			getPublished().some(
				(event) => event.eventType === BILLING_EVENT_TYPES.WEBHOOK_PROCESSED,
			),
		).toBe(true);
	});
});
