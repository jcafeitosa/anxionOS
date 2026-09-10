import { z } from "zod";
import {
	capitalAccountIdSchema,
	capitalExecutionModeSchema,
	capitalReservationKindSchema,
	decimalAmountSchema,
} from "./types";
export const capitalCommandResultSchema = z.object({
	aggregateId: z.string().min(1),
	revision: z.number().int().nonnegative(),
	idempotentReplay: z.boolean().optional(),
	accountId: capitalAccountIdSchema.optional(),
	allocationId: z.string().optional(),
	reservationId: z.string().optional(),
});
export const registerCapitalAccountCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	ownerUserId: z.string().uuid(),
	baseCurrency: z.string().min(3).max(8),
	initialSettledAmount: decimalAmountSchema,
	executionMode: capitalExecutionModeSchema,
});
export const proposeAllocationCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	accountId: capitalAccountIdSchema,
	portfolioId: z.string().uuid(),
	grantId: z.string().uuid(),
	limitAmount: decimalAmountSchema,
	limitCurrency: z.string().min(3).max(8),
	executionMode: capitalExecutionModeSchema,
});
export const reserveForIntentCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	accountId: capitalAccountIdSchema,
	portfolioId: z.string().uuid(),
	grantId: z.string().uuid(),
	intentHash: z.string().min(32).max(128),
	asset: z.string().min(1).max(16),
	amount: decimalAmountSchema,
	reservationKind: capitalReservationKindSchema,
	expiresAt: z.string().datetime().optional(),
	executionMode: capitalExecutionModeSchema,
});

export type CapitalCommandResult = z.infer<typeof capitalCommandResultSchema>;

export type RegisterCapitalAccountCommand = z.infer<
	typeof registerCapitalAccountCommandSchema
>;

export type ProposeAllocationCommand = z.infer<
	typeof proposeAllocationCommandSchema
>;

export type ReserveForIntentCommand = z.infer<
	typeof reserveForIntentCommandSchema
>;

export const releaseReservationCommandSchema = z.object({
	commandId: z.string().uuid(),
	organizationId: z.string().uuid(),
	reservationId: z.string().min(1).max(64),
	releaseAmount: decimalAmountSchema,
	reason: z.enum(["cancel", "partial_fill", "expired"]),
});
export type ReleaseReservationCommand = z.infer<
	typeof releaseReservationCommandSchema
>;
