import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type {
	BillingTransactionContext,
	BillingUnitOfWork,
	InvoiceRecord,
	SubscriptionRecord,
} from "../../domain/ports/billing-unit-of-work";
import type { CommandJournalEntry } from "../../domain/ports/command-journal";

export const TEST_ORG = "00000000-0000-4000-8000-000000000001";
export const TEST_ORG_B = "00000000-0000-4000-8000-000000000002";

export function createBillingTestUow(initial?: {
	subscriptions?: SubscriptionRecord[];
	invoices?: InvoiceRecord[];
}) {
	const subscriptions = new Map(
		(initial?.subscriptions ?? []).map((row) => [row.id, row]),
	);
	const invoices = new Map(
		(initial?.invoices ?? []).map((row) => [row.id, row]),
	);
	const journal = new Map<string, CommandJournalEntry>();
	const webhookJournal = new Map<string, CommandJournalEntry>();
	let published: DomainEventEnvelope[] = [];

	const ctx: BillingTransactionContext = {
		commandJournal: {
			async findByCommandId(commandId) {
				return journal.get(commandId) ?? null;
			},
			async findByUsageRecordId() {
				return null;
			},
			async findByWebhookEventId(webhookEventId) {
				return webhookJournal.get(webhookEventId) ?? null;
			},
			async save(entry) {
				journal.set(entry.commandId, entry);
				if (entry.webhookEventId) {
					webhookJournal.set(entry.webhookEventId, entry);
				}
			},
		},
		subscriptions: {
			async findById(id) {
				return subscriptions.get(id) ?? null;
			},
			async findActiveByOrganizationAndPlan(organizationId, planCode) {
				for (const row of subscriptions.values()) {
					if (
						row.organizationId === organizationId &&
						row.planCode === planCode &&
						row.status === "ACTIVE"
					) {
						return row;
					}
				}
				return null;
			},
			async save(record) {
				subscriptions.set(record.id, record);
				return record;
			},
			async updateStatus(id, status) {
				const current = subscriptions.get(id);
				if (!current) throw new Error("subscription not found");
				const updated = { ...current, status };
				subscriptions.set(id, updated);
				return updated;
			},
		},
		invoices: {
			async findById(id) {
				return invoices.get(id) ?? null;
			},
			async findDraftBySubscriptionAndPeriod() {
				return null;
			},
			async save(record) {
				invoices.set(record.id, record);
				return record;
			},
			async updateStatus(id, status, issuedAt) {
				const current = invoices.get(id);
				if (!current) throw new Error("invoice not found");
				const updated = { ...current, status, issuedAt };
				invoices.set(id, updated);
				return updated;
			},
			async updateTotalAmount() {},
		},
		invoiceLines: {
			async findByUsageRecordId() {
				return null;
			},
			async save(record) {
				return record;
			},
			async sumAmountByInvoice() {
				return "0";
			},
		},
		usageAggregations: {
			async findByUsageRecordId() {
				return null;
			},
			async save(record) {
				return record;
			},
		},
		async publishEvents(events) {
			published = [...published, ...events];
		},
	};

	const unitOfWork: BillingUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};

	return {
		unitOfWork,
		commandJournal: ctx.commandJournal,
		getSubscriptions: () => subscriptions,
		getInvoices: () => invoices,
		getPublished: () => published,
	};
}

export function testSubscriptionId(): string {
	return `bil_sub_${randomUUID()}`;
}

export function testInvoiceId(): string {
	return `bil_inv_${randomUUID()}`;
}
