import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { PARTNERS_EVENT_TYPES } from "@anxionos/contracts/partners";
import {
	createPartnersTestUow,
	TEST_PARTNER_ORG,
	TEST_REFERRED_ORG,
	testCommandId,
} from "../commands/partners-test-support";
import { registerPartner } from "../commands/register-partner";
import { createInvoicePaidConsumer } from "./invoice-paid-consumer";

describe("invoice.paid consumer", () => {
	test("accrues once from a paid invoice and ignores command id changes", async () => {
		const { unitOfWork, commandJournal, getPublished, getAccruals } =
			createPartnersTestUow();
		await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-PAID",
				displayName: "Paid Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		const consumer = createInvoicePaidConsumer({
			unitOfWork,
			commandJournal,
		});
		const paid = {
			invoiceId: `bil_inv_${randomUUID()}`,
			organizationId: TEST_REFERRED_ORG,
			subscriptionId: `bil_sub_${randomUUID()}`,
			billingPeriod: "2026-09",
			totalAmount: "1000",
			paidAt: "2026-09-10T12:00:00.000Z",
		};
		const first = await consumer.handle(paid, TEST_PARTNER_ORG);
		const second = await consumer.handle(paid, TEST_PARTNER_ORG);

		expect(second.idempotentReplay).toBe(true);
		expect(second.commissionAccrualId).toBe(first.commissionAccrualId);
		expect(getAccruals()).toHaveLength(1);
		expect(
			getPublished().filter(
				(event) => event.eventType === PARTNERS_EVENT_TYPES.COMMISSION_ACCRUED,
			),
		).toHaveLength(1);
	});
});
