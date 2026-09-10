import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface SubscriptionRecord {
	id: string;
	organizationId: string;
	planCode: string;
	billingPeriodStart: string;
	billingPeriodEnd: string;
	status: string;
}
export interface InvoiceRecord {
	id: string;
	organizationId: string;
	subscriptionId: string;
	billingPeriod: string;
	status: string;
	totalAmount: string;
	issuedAt: string | null;
}
export interface InvoiceLineRecord {
	id: string;
	invoiceId: string;
	organizationId: string;
	usageRecordId: string;
	description: string;
	quantity: string;
	unitPrice: string;
	amount: string;
}
export interface UsageAggregationRecord {
	id: string;
	organizationId: string;
	subscriptionId: string;
	usageRecordId: string;
	billingPeriod: string;
	quantity: string;
	unit: string;
	unitPrice: string;
	amount: string;
	consumerKind: string;
}
export interface SubscriptionRepository {
	findById(id: string): Promise<SubscriptionRecord | null>;
	findActiveByOrganizationAndPlan(
		organizationId: string,
		planCode: string,
	): Promise<SubscriptionRecord | null>;
	save(record: SubscriptionRecord): Promise<SubscriptionRecord>;
}
export interface InvoiceRepository {
	findById(id: string): Promise<InvoiceRecord | null>;
	findDraftBySubscriptionAndPeriod(
		subscriptionId: string,
		billingPeriod: string,
	): Promise<InvoiceRecord | null>;
	save(record: InvoiceRecord): Promise<InvoiceRecord>;
	updateStatus(
		id: string,
		status: string,
		issuedAt: string | null,
	): Promise<InvoiceRecord>;
	updateTotalAmount(id: string, totalAmount: string): Promise<void>;
}
export interface InvoiceLineRepository {
	findByUsageRecordId(usageRecordId: string): Promise<InvoiceLineRecord | null>;
	save(record: InvoiceLineRecord): Promise<InvoiceLineRecord>;
	sumAmountByInvoice(invoiceId: string): Promise<string>;
}
export interface UsageAggregationRepository {
	findByUsageRecordId(
		usageRecordId: string,
	): Promise<UsageAggregationRecord | null>;
	save(record: UsageAggregationRecord): Promise<UsageAggregationRecord>;
}
export interface BillingTransactionContext {
	commandJournal: CommandJournalRepository;
	subscriptions: SubscriptionRepository;
	invoices: InvoiceRepository;
	invoiceLines: InvoiceLineRepository;
	usageAggregations: UsageAggregationRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface BillingUnitOfWork {
	runInTransaction<T>(
		work: (ctx: BillingTransactionContext) => Promise<T>,
	): Promise<T>;
}
