import { randomUUID } from "node:crypto";
import type {
	BillingInvoicePaidBridge,
	PartnersCommandResult,
} from "@anxionos/contracts/partners";
import { mapInvoicePaidToAccrualInput } from "@anxionos/contracts/partners";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	type AccrueCommissionFromInvoiceDeps,
	accrueCommissionFromInvoice,
} from "../commands/accrue-commission-from-invoice";

export interface InvoicePaidConsumerDeps
	extends AccrueCommissionFromInvoiceDeps {
	commandJournal: CommandJournalRepository;
	unitOfWork: PartnersUnitOfWork;
}

export function createInvoicePaidConsumer(deps: InvoicePaidConsumerDeps): {
	handle(
		invoice: BillingInvoicePaidBridge,
		partnerOrganizationId: string,
	): Promise<PartnersCommandResult>;
} {
	return {
		async handle(invoice, partnerOrganizationId) {
			return accrueCommissionFromInvoice(
				deps,
				mapInvoicePaidToAccrualInput(
					invoice,
					randomUUID(),
					partnerOrganizationId,
				),
			);
		},
	};
}
