import { randomUUID } from "node:crypto";
import type {
	AccrueCommissionFromInvoiceInput,
	BillingInvoiceIssuedBridge,
} from "@anxionos/contracts/partners";
import {
	mapInvoiceIssuedToAccrualInput,
	type PartnersCommandResult,
} from "@anxionos/contracts/partners";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	accrueCommissionFromInvoice,
	type AccrueCommissionFromInvoiceDeps,
} from "../commands/accrue-commission-from-invoice";

export interface InvoiceIssuedConsumerDeps extends AccrueCommissionFromInvoiceDeps {
	commandJournal: CommandJournalRepository;
	unitOfWork: PartnersUnitOfWork;
}

export function createInvoiceIssuedConsumer(deps: InvoiceIssuedConsumerDeps): {
	handle(
		invoice: BillingInvoiceIssuedBridge,
		partnerOrganizationId: string,
	): Promise<PartnersCommandResult>;
} {
	return {
		async handle(invoice, partnerOrganizationId) {
			const input: AccrueCommissionFromInvoiceInput =
				mapInvoiceIssuedToAccrualInput(
					invoice,
					randomUUID(),
					partnerOrganizationId,
				);
			return accrueCommissionFromInvoice(deps, input);
		},
	};
}
