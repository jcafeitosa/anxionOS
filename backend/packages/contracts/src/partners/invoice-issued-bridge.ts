import { z } from "zod";
import { invoiceIssuedPayloadSchema } from "../billing/events";
/** Bridge schema for partners consumer input shaped as billing.invoice.issued.v1. */
export const billingInvoiceIssuedBridgeSchema = invoiceIssuedPayloadSchema;
export function mapInvoiceIssuedToAccrualInput(invoice: BillingInvoiceIssuedBridge, commandId: string, partnerOrganizationId: string): AccrueCommissionFromInvoiceInput {
    const parsed = billingInvoiceIssuedBridgeSchema.parse(invoice);
    return {
        commandId,
        partnerOrganizationId,
        invoiceId: parsed.invoiceId,
        referredOrganizationId: parsed.organizationId,
        subscriptionId: parsed.subscriptionId,
        billingPeriod: parsed.billingPeriod,
        totalAmount: parsed.totalAmount,
        issuedAt: parsed.issuedAt,
    };
}

export type BillingInvoiceIssuedBridge = z.infer<typeof billingInvoiceIssuedBridgeSchema>;
export interface AccrueCommissionFromInvoiceInput {
    commandId: string;
    partnerOrganizationId: string;
    invoiceId: string;
    referredOrganizationId: string;
    subscriptionId: string;
    billingPeriod: string;
    totalAmount: string;
    issuedAt: string;
}
