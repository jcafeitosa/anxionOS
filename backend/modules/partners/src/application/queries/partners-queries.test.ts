import { describe, expect, test } from "bun:test";
import {
	createPartnersTestUow,
	TEST_OTHER_PARTNER_ORG,
	TEST_PARTNER_ORG,
	TEST_REFERRED_ORG,
	testCommandId,
	testInvoiceId,
} from "../commands/partners-test-support";
import { accrueCommissionFromInvoice } from "../commands/accrue-commission-from-invoice";
import { registerPartner } from "../commands/register-partner";
import { requestPayout } from "../commands/request-payout";
import { getPartnerByOrganization } from "./get-partner-by-organization";
import { listCommissionAccruals } from "./list-commission-accruals";
import { listPayouts } from "./list-payouts";

describe("partners read queries (ANX-167 unblock)", () => {
	test("getPartnerByOrganization returns active partner scoped to organization", async () => {
		const { unitOfWork, commandJournal, partners } = createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-READ",
				displayName: "Read Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);

		const partner = await getPartnerByOrganization(
			{ partners: partners },
			TEST_PARTNER_ORG,
		);

		expect(partner.id).toBe(registered.partnerId!);
		expect(partner.organizationId).toBe(TEST_PARTNER_ORG);
	});

	test("getPartnerByOrganization rejects unknown organization", async () => {
		const { partners } = createPartnersTestUow();
		await expect(
			getPartnerByOrganization({ partners }, TEST_OTHER_PARTNER_ORG),
		).rejects.toMatchObject({ partnersCode: "PTR_PARTNER_NOT_FOUND" });
	});

	test("listCommissionAccruals returns only rows for the partner organization", async () => {
		const { unitOfWork, commandJournal, commissionAccruals } =
			createPartnersTestUow();
		const registered = await registerPartner(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				organizationId: TEST_PARTNER_ORG,
				referralCode: "REF-LIST",
				displayName: "List Partner",
				commissionRate: "10",
				referredOrganizationId: TEST_REFERRED_ORG,
			},
		);
		await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				referredOrganizationId: TEST_REFERRED_ORG,
				invoiceId: testInvoiceId(),
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "100",
				issuedAt: "2026-09-10T12:00:00.000Z",
			},
		);

		const rows = await listCommissionAccruals(
			{ commissionAccruals },
			TEST_PARTNER_ORG,
			registered.partnerId,
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.partnerOrganizationId).toBe(TEST_PARTNER_ORG);
		expect(rows[0]?.commissionAmount).toBe("10");
	});

	test("listPayouts returns payout history scoped to partner organization", async () => {
		const { unitOfWork, commandJournal, payouts } = createPartnersTestUow();
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
		await accrueCommissionFromInvoice(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				referredOrganizationId: TEST_REFERRED_ORG,
				invoiceId: testInvoiceId(),
				subscriptionId: "bil_sub_test",
				billingPeriod: "2026-09",
				totalAmount: "200",
				issuedAt: "2026-09-10T12:00:00.000Z",
			},
		);
		await requestPayout(
			{ unitOfWork, commandJournal },
			{
				commandId: testCommandId(),
				partnerOrganizationId: TEST_PARTNER_ORG,
				partnerId: registered.partnerId!,
				requestedAt: new Date().toISOString(),
			},
		);

		const rows = await listPayouts(
			{ payouts },
			TEST_PARTNER_ORG,
			registered.partnerId,
		);

		expect(rows).toHaveLength(1);
		expect(rows[0]?.partnerOrganizationId).toBe(TEST_PARTNER_ORG);
		expect(rows[0]?.requestedAmount).toBe("20");
	});

	test("listCommissionAccruals isolates tenant data from other partner organizations", async () => {
		const { commissionAccruals } = createPartnersTestUow({
			accruals: [
				{
					id: "ptr_acc_test",
					partnerId: "ptr_prt_test",
					partnerOrganizationId: TEST_PARTNER_ORG,
					referredOrganizationId: TEST_REFERRED_ORG,
					invoiceId: testInvoiceId(),
					invoiceTotalAmount: "50.00",
					commissionRate: "10",
					commissionAmount: "5.00",
					status: "ACCRUED",
					accruedAt: new Date().toISOString(),
					reversedAt: null,
				},
			],
		});

		const rows = await listCommissionAccruals(
			{ commissionAccruals },
			TEST_OTHER_PARTNER_ORG,
		);
		expect(rows).toHaveLength(0);
	});
});
