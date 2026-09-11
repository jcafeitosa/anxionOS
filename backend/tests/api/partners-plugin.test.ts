import { describe, expect, test } from "bun:test";
import { partnersPartnerIdSchema } from "@anxionos/contracts/partners";
import { PartnersCommandError } from "@anxionos/partners";
import { mapPartnersError } from "../../apps/api/src/partners/error-handler";
import {
	toCommissionAccrualDto,
	toPartnerDto,
	toPayoutDto,
} from "../../apps/api/src/partners/handlers/read";

describe("partners API boundary", () => {
	test("mapPartnersError maps PTR_PARTNER_NOT_FOUND to 404", () => {
		const error = new PartnersCommandError(
			"PTR_PARTNER_NOT_FOUND",
			"partner not found",
		);
		const mapped = mapPartnersError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: "PTR_PARTNER_NOT_FOUND",
		});
	});

	test("mapPartnersError maps PTR_CROSS_TENANT to 403", () => {
		const error = new PartnersCommandError("PTR_CROSS_TENANT", "cross tenant");
		const mapped = mapPartnersError(error);
		expect(mapped.status).toBe(403);
	});

	test("partnerId query schema rejects tampered principal fields", () => {
		const parsed = partnersPartnerIdSchema.safeParse("not-a-partner-id");
		expect(parsed.success).toBe(false);
	});

	test("read DTOs expose ISO timestamps and decimal strings", () => {
		const partner = toPartnerDto({
			id: "ptr_prt_00000000-0000-4000-8000-000000000001",
			organizationId: "00000000-0000-4000-8000-000000000010",
			referralCode: "REF-1",
			displayName: "Acme",
			commissionRate: "10",
			referredOrganizationId: "00000000-0000-4000-8000-000000000020",
			status: "ACTIVE",
			revision: 1,
		});
		expect(partner.commissionRate).toBe("10");

		const accrual = toCommissionAccrualDto({
			id: "ptr_acc_00000000-0000-4000-8000-000000000002",
			partnerId: partner.id,
			partnerOrganizationId: partner.organizationId,
			referredOrganizationId: partner.referredOrganizationId,
			invoiceId: "bil_inv_test",
			invoiceTotalAmount: "100.00",
			commissionRate: "10",
			commissionAmount: "10.00",
			status: "ACCRUED",
			accruedAt: "2026-09-10T12:00:00.000Z",
			reversedAt: null,
		});
		expect(accrual.accruedAt).toBe("2026-09-10T12:00:00.000Z");

		const payout = toPayoutDto({
			id: "ptr_pay_00000000-0000-4000-8000-000000000003",
			partnerId: partner.id,
			partnerOrganizationId: partner.organizationId,
			requestedAmount: "10.00",
			status: "REQUESTED",
			requestedAt: "2026-09-10T13:00:00.000Z",
			approvedAt: null,
			approvalReference: null,
		});
		expect(payout.requestedAmount).toBe("10.00");
	});
});
