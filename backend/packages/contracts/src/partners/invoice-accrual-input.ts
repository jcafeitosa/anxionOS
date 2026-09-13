export interface AccrueCommissionFromInvoiceInput {
	commandId: string;
	partnerOrganizationId: string;
	invoiceId: string;
	referredOrganizationId: string;
	subscriptionId: string;
	billingPeriod: string;
	totalAmount: string;
	paidAt: string;
}
