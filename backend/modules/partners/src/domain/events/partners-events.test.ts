import { describe, expect, test } from "bun:test";
import {
	createCommissionAccruedEvent,
	createCommissionReversedEvent,
	createPayoutApprovedEvent,
	createPayoutFailedEvent,
	createPayoutProcessingEvent,
	createPayoutRequestedEvent,
	createPayoutReversedEvent,
	createPayoutScheduledEvent,
	createPayoutSettledEvent,
} from "./partners-events";

const ORGANIZATION_ID = "00000000-0000-4000-8000-000000000001";
const PARTNER_ID = "ptr_prt_00000000-0000-4000-8000-000000000002";
const ACCRUAL_ID = "ptr_acc_00000000-0000-4000-8000-000000000003";
const PAYOUT_ID = "ptr_pay_00000000-0000-4000-8000-000000000004";
const INVOICE_ID = "bil_inv_00000000-0000-4000-8000-000000000005";
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

	test("rejects secret-bearing referral IDs before publication", () => {
		expect(() =>
			createCommissionAccruedEvent({
				commissionAccrualId: ACCRUAL_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				referralId: "postgres://user:password@host/db",
				referredOrganizationId: ORGANIZATION_ID,
				invoiceId: INVOICE_ID,
				invoiceTotalAmount: "100.00",
				commissionRate: "0.10",
				commissionAmount: "10.00",
				accruedAt: OCCURRED_AT,
			}),
		).toThrow();
	});

	test("rejects secret-bearing values in all payout event factories", () => {
		expect(() =>
			createPayoutApprovedEvent({
				payoutId: PAYOUT_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				approvedAmount: "10.00",
				approvalReference: "Bearer partner-secret",
				approvedAt: OCCURRED_AT,
			}),
		).toThrow();
		expect(() =>
			createPayoutSettledEvent({
				payoutId: PAYOUT_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				settledAmount: "10.00",
				providerReference: "api_key=partner-secret",
				settledAt: OCCURRED_AT,
			}),
		).toThrow();
		expect(() =>
			createPayoutFailedEvent({
				payoutId: PAYOUT_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				failureReason: "postgres://user:password@host/db",
				attemptNumber: 1,
				failedAt: OCCURRED_AT,
			}),
		).toThrow();
		expect(() =>
			createPayoutReversedEvent({
				payoutId: PAYOUT_ID,
				partnerId: PARTNER_ID,
				organizationId: ORGANIZATION_ID,
				reversalReference: "-----BEGIN PRIVATE KEY-----",
				reversedAt: OCCURRED_AT,
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
