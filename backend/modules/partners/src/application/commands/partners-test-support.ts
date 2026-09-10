import { randomUUID } from "node:crypto";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalEntry } from "../../domain/ports/command-journal";
import type {
	CommissionAccrualRecord,
	PartnerRecord,
	PartnersTransactionContext,
	PartnersUnitOfWork,
	PayoutRecord,
} from "../../domain/ports/partners-unit-of-work";

export const TEST_PARTNER_ORG = "00000000-0000-4000-8000-000000000001";
export const TEST_REFERRED_ORG = "00000000-0000-4000-8000-000000000002";
export const TEST_OTHER_PARTNER_ORG = "00000000-0000-4000-8000-000000000003";

export function createPartnersTestUow(initial?: {
	partners?: PartnerRecord[];
	accruals?: CommissionAccrualRecord[];
	payouts?: PayoutRecord[];
}) {
	const partners = new Map(
		(initial?.partners ?? []).map((row) => [row.id, row]),
	);
	const accruals = new Map(
		(initial?.accruals ?? []).map((row) => [row.id, row]),
	);
	const payouts = new Map(
		(initial?.payouts ?? []).map((row) => [row.id, row]),
	);
	const journal = new Map<string, CommandJournalEntry>();
	const invoiceJournal = new Map<string, CommandJournalEntry>();
	let published: DomainEventEnvelope[] = [];

	const ctx: PartnersTransactionContext = {
		commandJournal: {
			async findByCommandId(commandId) {
				return journal.get(commandId) ?? null;
			},
			async findByInvoiceId(invoiceId) {
				return invoiceJournal.get(invoiceId) ?? null;
			},
			async save(entry) {
				journal.set(entry.commandId, entry);
				if (entry.invoiceId) {
					invoiceJournal.set(entry.invoiceId, entry);
				}
			},
		},
		partners: {
			async findById(id, organizationId) {
				const row = partners.get(id);
				return row && row.organizationId === organizationId ? row : null;
			},
			async findByOrganizationId(organizationId) {
				for (const row of partners.values()) {
					if (row.organizationId === organizationId && row.status === "ACTIVE") {
						return row;
					}
				}
				return null;
			},
			async findByReferralCode(referralCode, organizationId) {
				for (const row of partners.values()) {
					if (
						row.referralCode === referralCode &&
						row.organizationId === organizationId
					) {
						return row;
					}
				}
				return null;
			},
			async findByReferredOrganization(
				referredOrganizationId,
				partnerOrganizationId,
			) {
				for (const row of partners.values()) {
					if (
						row.referredOrganizationId === referredOrganizationId &&
						row.organizationId === partnerOrganizationId
					) {
						return row;
					}
				}
				return null;
			},
			async save(record) {
				partners.set(record.id, record);
				return record;
			},
		},
		commissionAccruals: {
			async findById(id, partnerOrganizationId) {
				const row = accruals.get(id);
				return row && row.partnerOrganizationId === partnerOrganizationId
					? row
					: null;
			},
			async findByInvoiceId(invoiceId, partnerOrganizationId) {
				for (const row of accruals.values()) {
					if (
						row.invoiceId === invoiceId &&
						row.partnerOrganizationId === partnerOrganizationId
					) {
						return row;
					}
				}
				return null;
			},
			async listAccruedByPartner(partnerId, partnerOrganizationId) {
				return [...accruals.values()].filter(
					(row) =>
						row.partnerId === partnerId &&
						row.partnerOrganizationId === partnerOrganizationId &&
						row.status === "ACCRUED",
				);
			},
			async listByPartnerOrganization(partnerOrganizationId, partnerId) {
				return [...accruals.values()]
					.filter(
						(row) =>
							row.partnerOrganizationId === partnerOrganizationId &&
							(partnerId === undefined || row.partnerId === partnerId),
					)
					.sort((a, b) => (a.accruedAt < b.accruedAt ? 1 : -1));
			},
			async save(record) {
				accruals.set(record.id, record);
				return record;
			},
			async update(record) {
				accruals.set(record.id, record);
				return record;
			},
		},
		payouts: {
			async findById(id, partnerOrganizationId) {
				const row = payouts.get(id);
				return row && row.partnerOrganizationId === partnerOrganizationId
					? row
					: null;
			},
			async listByPartnerOrganization(partnerOrganizationId, partnerId) {
				return [...payouts.values()]
					.filter(
						(row) =>
							row.partnerOrganizationId === partnerOrganizationId &&
							(partnerId === undefined || row.partnerId === partnerId),
					)
					.sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
			},
			async save(record) {
				payouts.set(record.id, record);
				return record;
			},
			async update(record) {
				payouts.set(record.id, record);
				return record;
			},
		},
		async publishEvents(events) {
			published = [...published, ...events];
		},
	};

	const unitOfWork: PartnersUnitOfWork = {
		async runInTransaction(work) {
			return work(ctx);
		},
	};

	return {
		unitOfWork,
		commandJournal: ctx.commandJournal,
		partners: ctx.partners,
		commissionAccruals: ctx.commissionAccruals,
		payouts: ctx.payouts,
		getPartners: () => partners,
		getAccruals: () => accruals,
		getPayouts: () => payouts,
		getPublished: () => published,
	};
}

export function testPartnerId(): string {
	return `ptr_prt_${randomUUID()}`;
}

export function testInvoiceId(): string {
	return `bil_inv_${randomUUID()}`;
}

export function testCommandId(): string {
	return randomUUID();
}
