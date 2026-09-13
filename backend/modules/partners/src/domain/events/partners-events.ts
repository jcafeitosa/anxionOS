import { randomUUID } from "node:crypto";
import { schemaVersion } from "@anxionos/contracts";
import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import {
	PARTNERS_EVENT_TYPES,
	PARTNERS_OWNER_DOMAIN,
	payoutApprovedPayloadSchema,
	payoutFailedPayloadSchema,
	payoutReversedPayloadSchema,
	payoutSettledPayloadSchema,
} from "@anxionos/contracts/partners";

export function createCommissionAccruedEvent(input: {
	commissionAccrualId: string;
	partnerId: string;
	organizationId: string;
	referralId: string;
	referredOrganizationId: string;
	invoiceId: string;
	invoiceTotalAmount: string;
	commissionRate: string;
	commissionAmount: string;
	accruedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.COMMISSION_ACCRUED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createCommissionReversedEvent(input: {
	commissionAccrualId: string;
	partnerId: string;
	organizationId: string;
	invoiceId: string;
	reversedAmount: string;
	reversedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.COMMISSION_REVERSED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createPayoutRequestedEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	requestedAmount: string;
	requestedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_REQUESTED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createPayoutApprovedEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	approvedAmount: string;
	approvalReference: string;
	approvedAt: string;
}): DomainEventEnvelope {
	const payload = payoutApprovedPayloadSchema.parse(input);
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_APPROVED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload,
	};
}

export function createPayoutScheduledEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	requestedAmount: string;
	requestedAt: string;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_SCHEDULED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createPayoutProcessingEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	processingAt: string;
	attemptNumber: number;
}): DomainEventEnvelope {
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_PROCESSING,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload: input,
	};
}

export function createPayoutSettledEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	settledAmount: string;
	providerReference: string;
	settledAt: string;
}): DomainEventEnvelope {
	const payload = payoutSettledPayloadSchema.parse(input);
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_SETTLED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload,
	};
}

export function createPayoutFailedEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	failureReason: string;
	attemptNumber: number;
	failedAt: string;
}): DomainEventEnvelope {
	const payload = payoutFailedPayloadSchema.parse(input);
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_FAILED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload,
	};
}

export function createPayoutReversedEvent(input: {
	payoutId: string;
	partnerId: string;
	organizationId: string;
	reversalReference: string;
	reversedAt: string;
}): DomainEventEnvelope {
	const payload = payoutReversedPayloadSchema.parse(input);
	return {
		eventId: randomUUID(),
		eventType: PARTNERS_EVENT_TYPES.PAYOUT_REVERSED,
		schemaVersion,
		ownerDomain: PARTNERS_OWNER_DOMAIN,
		occurredAt: new Date().toISOString(),
		payload,
	};
}
