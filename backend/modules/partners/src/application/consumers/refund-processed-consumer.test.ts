import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPartnersTestUow,
	TEST_PARTNER_ORG,
	TEST_REFERRED_ORG,
	testCommandId,
} from "../commands/partners-test-support";
import { registerPartner } from "../commands/register-partner";
import { createInvoicePaidConsumer } from "./invoice-paid-consumer";
import { createRefundProcessedConsumer } from "./refund-processed-consumer";

describe("refund.processed consumer", () => {
	test("reverses an eligible commission once by refundId", async () => {
		const { unitOfWork, commandJournal, getAccruals } = createPartnersTestUow();
		await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-REFUND",
				displayName: "Refund Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		const paidConsumer = createInvoicePaidConsumer({
			unitOfWork,
			commandJournal,
		});
		const invoiceId = `bil_inv_${randomUUID()}`;
		const accrued = await paidConsumer.handle(
			{
				invoiceId,
				organizationId: TEST_REFERRED_ORG,
				subscriptionId: `bil_sub_${randomUUID()}`,
				billingPeriod: "2026-09",
				totalAmount: "1000",
				paidAt: "2026-09-10T12:00:00.000Z",
			},
			TEST_PARTNER_ORG,
		);
		const consumer = createRefundProcessedConsumer({
			unitOfWork,
			commandJournal,
		});
		const refund = {
			refundId: randomUUID(),
			invoiceId,
			organizationId: TEST_REFERRED_ORG,
			subscriptionId: `bil_sub_${randomUUID()}`,
			refundAmount: "1000",
			refundedAt: "2026-09-11T12:00:00.000Z",
		};
		const first = await consumer.handle(refund, TEST_PARTNER_ORG);
		const replay = await consumer.handle(refund, TEST_PARTNER_ORG);

		expect(first.commissionAccrualId).toBe(accrued.commissionAccrualId);
		expect(replay.idempotentReplay).toBe(true);
		expect(getAccruals().get(accrued.commissionAccrualId!)?.status).toBe(
			"REVERSED",
		);
	});
});
