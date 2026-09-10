import { z } from "zod";
import {
	capitalAccountIdSchema,
	capitalAllocationIdSchema,
	capitalReservationIdSchema,
} from "./types";
export const CAPITAL_EVENT_TYPES = {
	ACCOUNT_REGISTERED: "capital.account.registered.v1",
	ALLOCATION_PROPOSED: "capital.allocation.proposed.v1",
	RESERVATION_CREATED: "capital.reservation.created.v1",
	RESERVATION_RELEASED: "capital.reservation.released.v1",
};
export const accountRegisteredPayloadSchema = z.object({
	accountId: capitalAccountIdSchema,
	ownerUserId: z.string().uuid(),
	baseCurrency: z.string().min(3).max(8),
	organizationId: z.string().uuid(),
});
export const allocationProposedPayloadSchema = z.object({
	allocationId: capitalAllocationIdSchema,
	accountId: capitalAccountIdSchema,
	grantId: z.string().uuid(),
	portfolioId: z.string().uuid(),
	organizationId: z.string().uuid(),
	limitAmount: z.string(),
	limitCurrency: z.string(),
});
export const reservationCreatedPayloadSchema = z.object({
	reservationId: capitalReservationIdSchema,
	accountId: capitalAccountIdSchema,
	intentHash: z.string(),
	amount: z.string(),
	asset: z.string(),
	organizationId: z.string().uuid(),
});
export const reservationReleasedPayloadSchema = z.object({
	reservationId: capitalReservationIdSchema,
	accountId: capitalAccountIdSchema,
	organizationId: z.string().uuid(),
	releasedAmount: z.string(),
	remainingAmount: z.string(),
	asset: z.string(),
	reason: z.enum(["cancel", "partial_fill", "expired"]),
	status: z.enum(["HELD", "RELEASED", "EXPIRED"]),
});
export const capitalEventPayloadSchema = z.discriminatedUnion("eventType", [
	z.object({
		eventType: z.literal(CAPITAL_EVENT_TYPES.ACCOUNT_REGISTERED),
		payload: accountRegisteredPayloadSchema,
	}),
	z.object({
		eventType: z.literal(CAPITAL_EVENT_TYPES.ALLOCATION_PROPOSED),
		payload: allocationProposedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(CAPITAL_EVENT_TYPES.RESERVATION_CREATED),
		payload: reservationCreatedPayloadSchema,
	}),
	z.object({
		eventType: z.literal(CAPITAL_EVENT_TYPES.RESERVATION_RELEASED),
		payload: reservationReleasedPayloadSchema,
	}),
]);

export type CapitalEventType =
	(typeof CAPITAL_EVENT_TYPES)[keyof typeof CAPITAL_EVENT_TYPES];
