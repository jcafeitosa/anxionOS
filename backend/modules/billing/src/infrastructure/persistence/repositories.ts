import type { PoolClient } from "pg";
import type {
	InvoiceLineRecord,
	InvoiceLineRepository,
	InvoiceRecord,
	InvoiceRepository,
	SubscriptionRecord,
	SubscriptionRepository,
	UsageAggregationRecord,
	UsageAggregationRepository,
} from "../../domain/ports/billing-unit-of-work";

function mapSubscription(row: Record<string, unknown>): SubscriptionRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		planCode: String(row.plan_code),
		billingPeriodStart: (row.billing_period_start as Date).toISOString(),
		billingPeriodEnd: (row.billing_period_end as Date).toISOString(),
		status: String(row.status),
	};
}
function mapInvoice(row: Record<string, unknown>): InvoiceRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		subscriptionId: String(row.subscription_id),
		billingPeriod: String(row.billing_period),
		status: String(row.status),
		totalAmount: String(row.total_amount),
		issuedAt: row.issued_at ? (row.issued_at as Date).toISOString() : null,
	};
}
function mapInvoiceLine(row: Record<string, unknown>): InvoiceLineRecord {
	return {
		id: String(row.id),
		invoiceId: String(row.invoice_id),
		organizationId: String(row.organization_id),
		usageRecordId: String(row.usage_record_id),
		description: String(row.description),
		quantity: String(row.quantity),
		unitPrice: String(row.unit_price),
		amount: String(row.amount),
	};
}
function mapUsageAggregation(
	row: Record<string, unknown>,
): UsageAggregationRecord {
	return {
		id: String(row.id),
		organizationId: String(row.organization_id),
		subscriptionId: String(row.subscription_id),
		usageRecordId: String(row.usage_record_id),
		billingPeriod: String(row.billing_period),
		quantity: String(row.quantity),
		unit: String(row.unit),
		unitPrice: String(row.unit_price),
		amount: String(row.amount),
		consumerKind: String(row.consumer_kind),
	};
}
export function createPgSubscriptionRepository(
	client: PoolClient,
): SubscriptionRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM billing_subscriptions WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapSubscription(row) : null;
		},
		async findActiveByOrganizationAndPlan(organizationId, planCode) {
			const result = await client.query(
				`SELECT * FROM billing_subscriptions
			 WHERE organization_id = $1 AND plan_code = $2 AND status = 'ACTIVE'
			 ORDER BY created_at DESC LIMIT 1`,
				[organizationId, planCode],
			);
			const row = result.rows[0];
			return row ? mapSubscription(row) : null;
		},
		async save(record: SubscriptionRecord) {
			await client.query(
				`INSERT INTO billing_subscriptions (
			   id, organization_id, plan_code, billing_period_start, billing_period_end, status
			 ) VALUES ($1,$2,$3,$4,$5,$6)`,
				[
					record.id,
					record.organizationId,
					record.planCode,
					record.billingPeriodStart,
					record.billingPeriodEnd,
					record.status,
				],
			);
			return record;
		},
	};
}
export function createPgInvoiceRepository(
	client: PoolClient,
): InvoiceRepository {
	return {
		async findById(id) {
			const result = await client.query(
				"SELECT * FROM billing_invoices WHERE id = $1",
				[id],
			);
			const row = result.rows[0];
			return row ? mapInvoice(row) : null;
		},
		async findDraftBySubscriptionAndPeriod(subscriptionId, billingPeriod) {
			const result = await client.query(
				`SELECT * FROM billing_invoices
			 WHERE subscription_id = $1 AND billing_period = $2 AND status = 'DRAFT'
			 ORDER BY created_at DESC LIMIT 1`,
				[subscriptionId, billingPeriod],
			);
			const row = result.rows[0];
			return row ? mapInvoice(row) : null;
		},
		async save(record: InvoiceRecord) {
			await client.query(
				`INSERT INTO billing_invoices (
			   id, organization_id, subscription_id, billing_period, status, total_amount, issued_at
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
				[
					record.id,
					record.organizationId,
					record.subscriptionId,
					record.billingPeriod,
					record.status,
					record.totalAmount,
					record.issuedAt,
				],
			);
			return record;
		},
		async updateStatus(id, status, issuedAt) {
			const result = await client.query(
				`UPDATE billing_invoices SET status = $2, issued_at = $3
			 WHERE id = $1 RETURNING *`,
				[id, status, issuedAt],
			);
			return mapInvoice(result.rows[0]);
		},
		async updateTotalAmount(id, totalAmount) {
			await client.query(
				"UPDATE billing_invoices SET total_amount = $2 WHERE id = $1",
				[id, totalAmount],
			);
		},
	};
}
export function createPgInvoiceLineRepository(
	client: PoolClient,
): InvoiceLineRepository {
	return {
		async findByUsageRecordId(usageRecordId) {
			const result = await client.query(
				"SELECT * FROM billing_invoice_lines WHERE usage_record_id = $1",
				[usageRecordId],
			);
			const row = result.rows[0];
			return row ? mapInvoiceLine(row) : null;
		},
		async save(record: InvoiceLineRecord) {
			await client.query(
				`INSERT INTO billing_invoice_lines (
			   id, invoice_id, organization_id, usage_record_id, description,
			   quantity, unit_price, amount
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
				[
					record.id,
					record.invoiceId,
					record.organizationId,
					record.usageRecordId,
					record.description,
					record.quantity,
					record.unitPrice,
					record.amount,
				],
			);
			return record;
		},
		async sumAmountByInvoice(invoiceId) {
			const result = await client.query(
				"SELECT COALESCE(SUM(amount), 0) AS total FROM billing_invoice_lines WHERE invoice_id = $1",
				[invoiceId],
			);
			return String(result.rows[0]?.total ?? "0");
		},
	};
}
export function createPgUsageAggregationRepository(
	client: PoolClient,
): UsageAggregationRepository {
	return {
		async findByUsageRecordId(usageRecordId) {
			const result = await client.query(
				"SELECT * FROM billing_usage_aggregations WHERE usage_record_id = $1",
				[usageRecordId],
			);
			const row = result.rows[0];
			return row ? mapUsageAggregation(row) : null;
		},
		async save(record: UsageAggregationRecord) {
			await client.query(
				`INSERT INTO billing_usage_aggregations (
			   id, organization_id, subscription_id, usage_record_id, billing_period,
			   quantity, unit, unit_price, amount, consumer_kind
			 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				[
					record.id,
					record.organizationId,
					record.subscriptionId,
					record.usageRecordId,
					record.billingPeriod,
					record.quantity,
					record.unit,
					record.unitPrice,
					record.amount,
					record.consumerKind,
				],
			);
			return record;
		},
	};
}
