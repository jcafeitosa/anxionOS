import type {
	BillingRefundProcessedBridge,
	PartnersCommandResult,
} from "@anxionos/contracts/partners";
import { billingRefundProcessedBridgeSchema } from "@anxionos/contracts/partners";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import {
	type ReverseCommissionFromInvoiceDeps,
	reverseCommissionFromInvoice,
} from "../commands/reverse-commission-from-invoice";

export interface RefundProcessedConsumerDeps
	extends ReverseCommissionFromInvoiceDeps {
	commandJournal: CommandJournalRepository;
	unitOfWork: PartnersUnitOfWork;
}

export function createRefundProcessedConsumer(
	deps: RefundProcessedConsumerDeps,
): {
	handle(
		refund: BillingRefundProcessedBridge,
		partnerOrganizationId: string,
	): Promise<PartnersCommandResult>;
} {
	return {
		async handle(refund, partnerOrganizationId) {
			const parsed = billingRefundProcessedBridgeSchema.parse(refund);
			return reverseCommissionFromInvoice(deps, {
				commandId: parsed.refundId,
				refundId: parsed.refundId,
				partnerOrganizationId,
				invoiceId: parsed.invoiceId,
				reversedAt: parsed.refundedAt,
			});
		},
	};
}
