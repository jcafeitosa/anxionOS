import { institutionalUuidSchema } from "@anxionos/contracts";
import { partnersPartnerIdSchema } from "@anxionos/contracts/partners";
import {
	type CommissionAccrualRecord,
	getPartnerByOrganization,
	listCommissionAccruals,
	listPayouts,
	type PartnerRecord,
	type PayoutRecord,
} from "@anxionos/partners";
import { z } from "zod";
import type { PartnersPluginDeps } from "../plugin";

export const organizationIdParamSchema = z.object({
	organizationId: institutionalUuidSchema,
});

const partnerIdQuerySchema = z
	.object({
		partnerId: partnersPartnerIdSchema.optional(),
	})
	.strict();

export function toPartnerDto(partner: PartnerRecord) {
	return {
		id: partner.id,
		organizationId: partner.organizationId,
		referralCode: partner.referralCode,
		displayName: partner.displayName,
		commissionRate: partner.commissionRate,
		referredOrganizationId: partner.referredOrganizationId,
		status: partner.status,
		revision: partner.revision,
	};
}

export function toCommissionAccrualDto(accrual: CommissionAccrualRecord) {
	return {
		id: accrual.id,
		partnerId: accrual.partnerId,
		partnerOrganizationId: accrual.partnerOrganizationId,
		referredOrganizationId: accrual.referredOrganizationId,
		invoiceId: accrual.invoiceId,
		invoiceTotalAmount: accrual.invoiceTotalAmount,
		commissionRate: accrual.commissionRate,
		commissionAmount: accrual.commissionAmount,
		status: accrual.status,
		accruedAt: accrual.accruedAt,
		reversedAt: accrual.reversedAt,
	};
}

export function toPayoutDto(payout: PayoutRecord) {
	return {
		id: payout.id,
		partnerId: payout.partnerId,
		partnerOrganizationId: payout.partnerOrganizationId,
		requestedAmount: payout.requestedAmount,
		status: payout.status,
		requestedAt: payout.requestedAt,
		approvedAt: payout.approvedAt,
		approvalReference: payout.approvalReference,
	};
}

export async function handleGetPartnerByOrganization(
	deps: PartnersPluginDeps,
	input: { organizationId: string },
) {
	const { organizationId } = organizationIdParamSchema.parse(input);
	const partner = await getPartnerByOrganization(
		{ partners: deps.partners },
		organizationId,
	);
	return { partner: toPartnerDto(partner) };
}

export async function handleListCommissionAccruals(
	deps: PartnersPluginDeps,
	input: { organizationId: string; query: Record<string, string | undefined> },
) {
	const { organizationId } = organizationIdParamSchema.parse(input);
	const { partnerId } = partnerIdQuerySchema.parse(input.query);
	const accruals = await listCommissionAccruals(
		{ commissionAccruals: deps.commissionAccruals },
		organizationId,
		partnerId,
	);
	return { accruals: accruals.map(toCommissionAccrualDto) };
}

export async function handleListPayouts(
	deps: PartnersPluginDeps,
	input: { organizationId: string; query: Record<string, string | undefined> },
) {
	const { organizationId } = organizationIdParamSchema.parse(input);
	const { partnerId } = partnerIdQuerySchema.parse(input.query);
	const payouts = await listPayouts(
		{ payouts: deps.payouts },
		organizationId,
		partnerId,
	);
	return { payouts: payouts.map(toPayoutDto) };
}
