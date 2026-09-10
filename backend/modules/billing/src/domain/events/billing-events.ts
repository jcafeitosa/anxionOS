import { randomUUID } from "node:crypto";
import {
	BILLING_EVENT_TYPES,
	BILLING_OWNER_DOMAIN,
} from "@anxionos/contracts/billing";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";

export function createInvoiceIssuedEvent(input: {
	invoiceId: string;
	organizationId: string;
	subscriptionId: string;
	billingPeriod: string;
	totalAmount: string;
	issuedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: BILLING_EVENT_TYPES.INVOICE_ISSUED,
		schemaVersion: "0.1.0",
		ownerDomain: BILLING_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createSubscriptionCancelledEvent(input: {
	subscriptionId: string;
	organizationId: string;
	cancelledAt: string;
	reason?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: BILLING_EVENT_TYPES.SUBSCRIPTION_CANCELLED,
		schemaVersion: "0.1.0",
		ownerDomain: BILLING_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createInvoiceRefundedEvent(input: {
	invoiceId: string;
	organizationId: string;
	subscriptionId: string;
	refundAmount: string;
	refundedAt: string;
	reason?: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: BILLING_EVENT_TYPES.INVOICE_REFUNDED,
		schemaVersion: "0.1.0",
		ownerDomain: BILLING_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createWebhookProcessedEvent(input: {
	webhookEventId: string;
	organizationId: string;
	eventType: string;
	occurredAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: BILLING_EVENT_TYPES.WEBHOOK_PROCESSED,
		schemaVersion: "0.1.0",
		ownerDomain: BILLING_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}
