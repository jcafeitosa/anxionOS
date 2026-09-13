import { describe, expect, test } from "bun:test";
import {
	createCommissionAccruedEvent,
	createCommissionReversedEvent,
	createPayoutProcessingEvent,
	createPayoutRequestedEvent,
	createPayoutScheduledEvent,
} from "./partners-events";

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const PARTNER_ID = "ptr_prt_00000000-0000-4000-8000-000000000002";
const ACCRUAL_ID = "ptr_acc_00000000-0000-4000-8000-000000000003";
const PAYOUT_ID = "ptr_pay_00000000-0000-4000-8000-000000000004";
const INVOICE_ID = "inv_00000000-0000-4000-8000-000000000005";
const OCCURRED_AT = "2026-09-13T12:00:00.000Z";

describe("partners event factories", () => {
	test("validates commission accrued payload", () => {
		expect(() =>
			createCommissionAccruedEvent({
				commissionAccrualId: ACCRUAL_ID,
				partnerId: PARTNER_ID,
				organizationId: "not-an-organization",
				referralId: "REF-001",
				referredOrganizationId: ORGANIZATION_ID,
				invoiceId: INVOICE_ID,
				invoiceTotalAmount: "100.00",
				commissionRate: "0.10",
				commissionAmount: "10.00",
				accruedAt: OCCURRED_AT,
			}),
		).toThrow();
	});

	test("validates commission reversed payload", () => {
		expect(() =>
			createCommissionReversedEvent({
				commissionAccrualId: ACCRUAL_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				invoiceId: INVOICE_ID,
				reversedAmount: "-10.00",
				reversedAt: OCCURRED_AT,
			}),
		).toThrow();
	});

	test("validates payout requested payload", () => {
		expect(() =>
			createPayoutRequestedEvent({
				payoutId: PAYOUT_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				requestedAmount: "10.00",
				requestedAt: "not-a-date",
			}),
		).toThrow();
	});

	test("validates payout scheduled payload", () => {
		expect(() =>
			createPayoutScheduledEvent({
				payoutId: "invalid-payout-id",
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				requestedAmount: "10.00",
				requestedAt: OCCURRED_AT,
			}),
		).toThrow();
	});

	test("validates payout processing payload", () => {
		expect(() =>
			createPayoutProcessingEvent({
				payoutId: PAYOUT_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				processingAt: OCCURRED_AT,
				attemptNumber: 0,
			}),
		).toThrow();
	});
});
