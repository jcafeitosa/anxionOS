import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";

export interface PartnerRecord {
	id: string;
	organizationId: string;
	referralCode: string;
	displayName: string;
	commissionRate: string;
	referredOrganizationId: string;
	status: string;
	revision: number;
}

export interface CommissionAccrualRecord {
	id: string;
	partnerId: string;
	partnerOrganizationId: string;
	referredOrganizationId: string;
	invoiceId: string;
	invoiceTotalAmount: string;
	commissionRate: string;
	commissionAmount: string;
	status: string;
	accruedAt: string;
	reversedAt: string | null;
}

export interface PayoutRecord {
	id: string;
	partnerId: string;
	partnerOrganizationId: string;
	requestedAmount: string;
	status: string;
	requestedAt: string;
	approvedAt: string | null;
	approvalReference: string | null;
}

export interface PartnerRepository {
	findById(id: string, organizationId: string): Promise<PartnerRecord | null>;
	findByOrganizationId(organizationId: string): Promise<PartnerRecord | null>;
	findByReferralCode(
		referralCode: string,
		organizationId: string,
	): Promise<PartnerRecord | null>;
	findByReferredOrganization(
		referredOrganizationId: string,
		partnerOrganizationId: string,
	): Promise<PartnerRecord | null>;
	save(record: PartnerRecord): Promise<PartnerRecord>;
}

export interface CommissionAccrualRepository {
	findById(
		id: string,
		partnerOrganizationId: string,
	): Promise<CommissionAccrualRecord | null>;
	findByInvoiceId(
		invoiceId: string,
		partnerOrganizationId: string,
	): Promise<CommissionAccrualRecord | null>;
	listAccruedByPartner(
		partnerId: string,
		partnerOrganizationId: string,
	): Promise<CommissionAccrualRecord[]>;
	listByPartnerOrganization(
		partnerOrganizationId: string,
		partnerId?: string,
	): Promise<CommissionAccrualRecord[]>;
	save(record: CommissionAccrualRecord): Promise<CommissionAccrualRecord>;
	update(record: CommissionAccrualRecord): Promise<CommissionAccrualRecord>;
}

export interface PayoutRepository {
	findById(
		id: string,
		partnerOrganizationId: string,
	): Promise<PayoutRecord | null>;
	listByPartnerOrganization(
		partnerOrganizationId: string,
		partnerId?: string,
	): Promise<PayoutRecord[]>;
	save(record: PayoutRecord): Promise<PayoutRecord>;
	update(record: PayoutRecord): Promise<PayoutRecord>;
}

export interface PartnersTransactionContext {
	commandJournal: CommandJournalRepository;
	partners: PartnerRepository;
	commissionAccruals: CommissionAccrualRepository;
	payouts: PayoutRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}

export interface PartnersUnitOfWork {
	runInTransaction<T>(
		work: (ctx: PartnersTransactionContext) => Promise<T>,
	): Promise<T>;
}
