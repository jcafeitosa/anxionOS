import type { Pool, PoolClient } from "pg";

type PgQueryable = Pool | PoolClient;
import type {
	CommissionAccrualRecord,
	CommissionAccrualRepository,
	PartnerRecord,
	PartnerRepository,
	PayoutRecord,
	PayoutRepository,
} from "../../domain/ports/partners-unit-of-work";

function mapPartner(row: Record<string, unknown>): PartnerRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		referralCode: String(row.referral_code),
		displayName: String(row.display_name),
		commissionRate: String(row.commission_rate),
		referredOrganizationId: String(row.referred_organization_id),
		status: String(row.status),
		revision: Number(row.revision),
	};
}

function mapAccrual(row: Record<string, unknown>): CommissionAccrualRecord {
	return {
		id: String(row.id),
		partnerId: String(row.partner_id),
		partnerOrganizationId: String(row.partner_organization_id),
		referredOrganizationId: String(row.referred_organization_id),
		invoiceId: String(row.invoice_id),
		invoiceTotalAmount: String(row.invoice_total_amount),
		commissionRate: String(row.commission_rate),
		commissionAmount: String(row.commission_amount),
		status: String(row.status),
		accruedAt: (row.accrued_at as Date).toISOString(),
		reversedAt: row.reversed_at
			? (row.reversed_at as Date).toISOString()
			: null,
	};
}

function mapPayout(row: Record<string, unknown>): PayoutRecord {
	return {
		id: String(row.id),
		partnerId: String(row.partner_id),
		partnerOrganizationId: String(row.partner_organization_id),
		requestedAmount: String(row.requested_amount),
		status: String(row.status),
		requestedAt: (row.requested_at as Date).toISOString(),
		approvedAt: row.approved_at ? (row.approved_at as Date).toISOString() : null,
		approvalReference: row.approval_reference
			? String(row.approval_reference)
			: null,
	};
}

export function createPgPartnerRepository(client: PgQueryable): PartnerRepository {
	return {
		async findById(id, organizationId) {
			const result = await client.query(
				`SELECT * FROM partners_partners WHERE id = $1 AND organization_id = $2`,
				[id, organizationId],
			);
			const row = result.rows[0];
			return row ? mapPartner(row) : null;
		},
		async findByOrganizationId(organizationId) {
			const result = await client.query(
				`SELECT * FROM partners_partners
			 WHERE organization_id = $1 AND status = 'ACTIVE'
			 ORDER BY created_at ASC LIMIT 1`,
				[organizationId],
			);
			const row = result.rows[0];
			return row ? mapPartner(row) : null;
		},
		async findByReferralCode(referralCode, organizationId) {
			const result = await client.query(
				`SELECT * FROM partners_partners
			 WHERE referral_code = $1 AND organization_id = $2`,
				[referralCode, organizationId],
			);
			const row = result.rows[0];
			return row ? mapPartner(row) : null;
		},
		async findByReferredOrganization(referredOrganizationId, partnerOrganizationId) {
			const result = await client.query(
				`SELECT * FROM partners_partners
			 WHERE referred_organization_id = $1 AND organization_id = $2`,
				[referredOrganizationId, partnerOrganizationId],
			);
			const row = result.rows[0];
			return row ? mapPartner(row) : null;
		},
		async save(record) {
			await client.query(
				`INSERT INTO partners_partners (
			   id, organization_id, referral_code, display_name, commission_rate,
			   referred_organization_id, status, revision
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.organizationId,
					record.referralCode,
					record.displayName,
					record.commissionRate,
					record.referredOrganizationId,
					record.status,
					record.revision,
				],
			);
			return record;
		},
	};
}

export function createPgCommissionAccrualRepository(
	client: PgQueryable,
): CommissionAccrualRepository {
	return {
		async findById(id, partnerOrganizationId) {
			const result = await client.query(
				`SELECT * FROM partners_commission_accruals
			 WHERE id = $1 AND partner_organization_id = $2`,
				[id, partnerOrganizationId],
			);
			const row = result.rows[0];
			return row ? mapAccrual(row) : null;
		},
		async findByInvoiceId(invoiceId, partnerOrganizationId) {
			const result = await client.query(
				`SELECT * FROM partners_commission_accruals
			 WHERE invoice_id = $1 AND partner_organization_id = $2`,
				[invoiceId, partnerOrganizationId],
			);
			const row = result.rows[0];
			return row ? mapAccrual(row) : null;
		},
		async listAccruedByPartner(partnerId, partnerOrganizationId) {
			const result = await client.query(
				`SELECT * FROM partners_commission_accruals
			 WHERE partner_id = $1 AND partner_organization_id = $2 AND status = 'ACCRUED'
			 ORDER BY accrued_at DESC`,
				[partnerId, partnerOrganizationId],
			);
			return result.rows.map(mapAccrual);
		},
		async listByPartnerOrganization(partnerOrganizationId, partnerId) {
			const result = partnerId
				? await client.query(
						`SELECT * FROM partners_commission_accruals
					 WHERE partner_organization_id = $1 AND partner_id = $2
					 ORDER BY accrued_at DESC`,
						[partnerOrganizationId, partnerId],
					)
				: await client.query(
						`SELECT * FROM partners_commission_accruals
					 WHERE partner_organization_id = $1
					 ORDER BY accrued_at DESC`,
						[partnerOrganizationId],
					);
			return result.rows.map(mapAccrual);
		},
		async save(record) {
			await client.query(
				`INSERT INTO partners_commission_accruals (
			   id, partner_id, partner_organization_id, referred_organization_id,
			   invoice_id, invoice_total_amount, commission_rate, commission_amount,
			   status, accrued_at, reversed_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
				[
					record.id,
					record.partnerId,
					record.partnerOrganizationId,
					record.referredOrganizationId,
					record.invoiceId,
					record.invoiceTotalAmount,
					record.commissionRate,
					record.commissionAmount,
					record.status,
					record.accruedAt,
					record.reversedAt,
				],
			);
			return record;
		},
		async update(record) {
			await client.query(
				`UPDATE partners_commission_accruals
			 SET status = $2, reversed_at = $3, updated_at = now()
			 WHERE id = $1`,
				[record.id, record.status, record.reversedAt],
			);
			return record;
		},
	};
}

export function createPgPayoutRepository(client: PgQueryable): PayoutRepository {
	return {
		async findById(id, partnerOrganizationId) {
			const result = await client.query(
				`SELECT * FROM partners_payouts WHERE id = $1 AND partner_organization_id = $2`,
				[id, partnerOrganizationId],
			);
			const row = result.rows[0];
			return row ? mapPayout(row) : null;
		},
		async listByPartnerOrganization(partnerOrganizationId, partnerId) {
			const result = partnerId
				? await client.query(
						`SELECT * FROM partners_payouts
					 WHERE partner_organization_id = $1 AND partner_id = $2
					 ORDER BY requested_at DESC`,
						[partnerOrganizationId, partnerId],
					)
				: await client.query(
						`SELECT * FROM partners_payouts
					 WHERE partner_organization_id = $1
					 ORDER BY requested_at DESC`,
						[partnerOrganizationId],
					);
			return result.rows.map(mapPayout);
		},
		async save(record) {
			await client.query(
				`INSERT INTO partners_payouts (
			   id, partner_id, partner_organization_id, requested_amount, status,
			   requested_at, approved_at, approval_reference
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.partnerId,
					record.partnerOrganizationId,
					record.requestedAmount,
					record.status,
					record.requestedAt,
					record.approvedAt,
					record.approvalReference,
				],
			);
			return record;
		},
		async update(record) {
			await client.query(
				`UPDATE partners_payouts
			 SET status = $2, approved_at = $3, approval_reference = $4, updated_at = now()
			 WHERE id = $1`,
				[
					record.id,
					record.status,
					record.approvedAt,
					record.approvalReference,
				],
			);
			return record;
		},
	};
}
