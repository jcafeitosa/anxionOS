import { describe, expect, test } from "bun:test";
import { PARTNERS_EVENT_TYPES } from "@anxionos/contracts/partners";
import { PartnersCommandError } from "../errors";
import { accrueCommissionFromInvoice } from "./accrue-commission-from-invoice";
import { approvePayout } from "./approve-payout";
import { failPayout } from "./fail-payout";
import {
	createPartnersTestUow,
	TEST_PARTNER_ORG,
	TEST_REFERRED_ORG,
	testCommandId,
	testInvoiceId,
} from "./partners-test-support";
import { registerPartner } from "./register-partner";
import { requestPayout } from "./request-payout";
import { retryPayout } from "./retry-payout";
import { reverseCommissionFromInvoice } from "./reverse-commission-from-invoice";
import { reversePayout } from "./reverse-payout";
import { settlePayout } from "./settle-payout";

describe("partners commands", () => {
	test("registerPartner creates partner scoped to organization", async () => {
		const { unitOfWork, commandJournal, getPartners } = createPartnersTestUow();
		const result = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-001",
				displayName: "Partner Alpha",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		expect(result.partnerId).toMatch(/^ptr_prt_/);
		expect(result.referralId).toBe("REF-001");
		const saved = getPartners().get(result.partnerId!);
		expect(saved?.organizationId).toBe(TEST_PARTNER_ORG);
	});

	test("registerPartner rejects duplicate referral code", async () => {
		const { unitOfWork, commandJournal } = createPartnersTestUow();
		const base = {
			organizationId: TEST_PARTNER_ORG,
			referralCode: "REF-DUP",
			displayName: "Partner",
			commissionRate: "5",
			referredOrganizationId: TEST_REFERRED_ORG,
		};
		await registerPartner(
			{ unitOfWork, commandJournal },
			{ ...base, commandId: testCommandId() },
		);
		await expect(
			registerPartner(
				{ unitOfWork, commandJournal },
				{
					...base,
					commandId: testCommandId(),
					referredOrganizationId: "00000000-0000-4000-8000-000000000099",
				},
			),
		).rejects.toMatchObject({ partnersCode: "PTR_REFERRAL_CONFLICT" });
	});

	test("registerPartner rejects a divergent replay for the same commandId", async () => {
		const { unitOfWork, commandJournal, getPartners, getPublished } =
			createPartnersTestUow();
		const commandId = testCommandId();
		const base = {
			commandId,
			organizationId: TEST_PARTNER_ORG,
			referralCode: "REF-INTENT",
			displayName: "Partner Alpha",
			commissionRate: "10",
			referredOrganizationId: TEST_REFERRED_ORG,
		};
		await registerPartner({ unitOfWork, commandJournal }, base);
		await expect(
			registerPartner(
				{ unitOfWork, commandJournal },
				{
					...base,
					displayName: "Partner Divergent",
				},
			),
		).rejects.toMatchObject({ partnersCode: "PTR_IDEMPOTENCY_CONFLICT" });
		expect(getPartners()).toHaveLength(1);
		expect(getPublished()).toHaveLength(0);
	});

	test("accrueCommissionFromInvoice calculates exact commission and is idempotent by invoice", async () => {
		const { unitOfWork, commandJournal, getPublished } =
			createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-COMM",
				displayName: "Commission Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		const invoiceId = testInvoiceId();
		const first = await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				invoiceId,
				referredOrganizationId: TEST_REFERRED_ORG,
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "1000",
				paidAt: "2026-09-10T12:00:00.000Z",
			},
		);
		expect(first.commissionAmount).toBe("100");
		expect(first.partnerId).toBe(registered.partnerId);
		const second = await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				invoiceId,
				referredOrganizationId: TEST_REFERRED_ORG,
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "1000",
				paidAt: "2026-09-10T12:00:00.000Z",
			},
		);
		expect(second.idempotentReplay).toBe(true);
		expect(second.commissionAccrualId).toBe(first.commissionAccrualId);
		expect(
			getPublished().filter(
				(event) => event.eventType === PARTNERS_EVENT_TYPES.COMMISSION_ACCRUED,
			),
		).toHaveLength(1);
	});

	test("reverseCommissionFromInvoice claws back accrued commission", async () => {
		const { unitOfWork, commandJournal, getAccruals } = createPartnersTestUow();
		await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-REV",
				displayName: "Reverse Partner",
				commissionRate: "20",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		const invoiceId = testInvoiceId();
		const accrued = await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				invoiceId,
				referredOrganizationId: TEST_REFERRED_ORG,
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "500",
				paidAt: "2026-09-10T12:00:00.000Z",
			},
		);
		const reversed = await reverseCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				invoiceId,
				reversedAt: "2026-09-11T12:00:00.000Z",
			},
		);
		expect(reversed.commissionAmount).toBe("100");
		const row = getAccruals().get(accrued.commissionAccrualId!);
		expect(row?.status).toBe("REVERSED");
	});

	test("requestPayout and approvePayout start processing and mark accruals paid", async () => {
		const {
			unitOfWork,
			commandJournal,
			getAccruals,
			getPayouts,
			getPublished,
		} = createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-PAY",
				displayName: "Payout Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		const invoiceId = testInvoiceId();
		const accrued = await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				invoiceId,
				referredOrganizationId: TEST_REFERRED_ORG,
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "200",
				paidAt: "2026-09-10T12:00:00.000Z",
			},
		);
		const requested = await requestPayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				partnerId: registered.partnerId!,
				requestedAt: "2026-09-12T12:00:00.000Z",
			},
		);
		expect(requested.commissionAmount).toBe("20");
		expect(getPayouts().get(requested.payoutId!)?.status).toBe("SCHEDULED");
		const approved = await approvePayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				approvedAt: "2026-09-13T12:00:00.000Z",
				approvalReference: "APPR-001",
			},
		);
		expect(approved.payoutId).toBe(requested.payoutId);
		expect(getPayouts().get(requested.payoutId!)?.status).toBe("PROCESSING");
		expect(getAccruals().get(accrued.commissionAccrualId!)?.status).toBe(
			"PAID",
		);
		expect(
			getPublished().some(
				(event) => event.eventType === PARTNERS_EVENT_TYPES.PAYOUT_PROCESSING,
			),
		).toBe(true);
	});

	test("payout lifecycle retries FAILED once and settles without duplicate events", async () => {
		const { unitOfWork, commandJournal, getPayouts, getPublished } =
			createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-LIFECYCLE",
				displayName: "Lifecycle Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				invoiceId: testInvoiceId(),
				referredOrganizationId: TEST_REFERRED_ORG,
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "200",
				paidAt: "2026-09-10T12:00:00.000Z",
			},
		);
		const requested = await requestPayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				partnerId: registered.partnerId!,
				requestedAt: "2026-09-12T12:00:00.000Z",
			},
		);
		const processing = await approvePayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				approvedAt: "2026-09-13T12:00:00.000Z",
				approvalReference: "APPR-LIFECYCLE",
			},
		);
		expect(processing.payoutStatus).toBe("PROCESSING");
		await expect(
			settlePayout(
				{ unitOfWork, commandJournal },
				{
					commandId: testCommandId(),
					partnerOrganizationId: "00000000-0000-4000-8000-000000000099",
					payoutId: requested.payoutId!,
					settledAt: "2026-09-13T12:00:30.000Z",
					providerReference: "cross-tenant",
				},
			),
		).rejects.toMatchObject({ partnersCode: "PTR_PAYOUT_NOT_FOUND" });
		const failureCommandId = testCommandId();
		const failed = await failPayout(
			{ unitOfWork, commandJournal },
			{
				commandId: failureCommandId,
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				failedAt: "2026-09-13T12:01:00.000Z",
				failureReason: "simulated provider timeout",
			},
		);
		expect(failed.payoutStatus).toBe("FAILED");
		const failedReplay = await failPayout(
			{ unitOfWork, commandJournal },
			{
				commandId: failureCommandId,
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				failedAt: "2026-09-13T12:01:00.000Z",
				failureReason: "simulated provider timeout",
			},
		);
		expect(failedReplay.idempotentReplay).toBe(true);
		const retried = await retryPayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				processingAt: "2026-09-13T12:02:00.000Z",
			},
		);
		expect(retried.payoutStatus).toBe("PROCESSING");
		expect(getPayouts().get(requested.payoutId!)?.attemptCount).toBe(2);
		const settled = await settlePayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				settledAt: "2026-09-13T12:03:00.000Z",
				providerReference: "sim_payout_001",
			},
		);
		expect(settled.payoutStatus).toBe("SETTLED");
		const reversed = await reversePayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				payoutId: requested.payoutId!,
				reversedAt: "2026-09-14T12:00:00.000Z",
				reversalReference: "refund_001",
			},
		);
		expect(reversed.payoutStatus).toBe("REVERSED");
		expect(
			getPublished().filter((event) => event.eventType.includes("payout")),
		).toHaveLength(6);
	});

	test("partner scope blocks cross-tenant partner lookup", async () => {
		const { unitOfWork, commandJournal } = createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-SCOPE",
				displayName: "Scoped Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		await expect(
			requestPayout(
				{ unitOfWork, commandJournal },
				{
					commandId: testCommandId(),
					partnerOrganizationId: "00000000-0000-4000-8000-000000000099",
					partnerId: registered.partnerId!,
					requestedAt: "2026-09-12T12:00:00.000Z",
				},
			),
		).rejects.toBeInstanceOf(PartnersCommandError);
	});

	test("requestPayout rejects when no accrued commission", async () => {
		const { unitOfWork, commandJournal } = createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-EMPTY",
				displayName: "Empty Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		await expect(
			requestPayout(
				{ unitOfWork, commandJournal },
				{
					commandId: testCommandId(),
					partnerOrganizationId: TEST_PARTNER_ORG,
					partnerId: registered.partnerId!,
					requestedAt: "2026-09-12T12:00:00.000Z",
				},
			),
		).rejects.toMatchObject({ partnersCode: "PTR_INSUFFICIENT_ACCRUAL" });
	});
});
