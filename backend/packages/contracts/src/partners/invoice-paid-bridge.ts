import type { z } from "zod";
import { invoicePaidPayloadSchema } from "../billing/events";
import type { AccrueCommissionFromInvoiceInput } from "./invoice-accrual-input";

export const billingInvoicePaidBridgeSchema = invoicePaidPayloadSchema;

export function mapInvoicePaidToAccrualInput(
	invoice: BillingInvoicePaidBridge,
	commandId: string,
	partnerOrganizationId: string,
): AccrueCommissionFromInvoiceInput {
	const parsed = billingInvoicePaidBridgeSchema.parse(invoice);
	return {
		commandId,
		partnerOrganizationId,
		invoiceId: parsed.invoiceId,
		referredOrganizationId: parsed.organizationId,
		subscriptionId: parsed.subscriptionId,
		billingPeriod: parsed.billingPeriod,
		totalAmount: parsed.totalAmount,
		paidAt: parsed.paidAt,
	};
}

export type BillingInvoicePaidBridge = z.infer<
	typeof billingInvoicePaidBridgeSchema
>;
