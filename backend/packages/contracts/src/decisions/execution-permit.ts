import { z } from "zod";
import { institutionalUuidSchema } from "../institutional-uuid";
import {
	assetClassSchema,
	executionModeSchema,
	permitStatusSchema,
} from "./types";
/** Single-use execution permit bound to TradeIntent hash (P02-03 / ANX-48). */
export const executionPermitSchema = z.object({
	permitId: institutionalUuidSchema,
	intentHash: z.string().min(1),
	intentId: institutionalUuidSchema,
	agencyId: institutionalUuidSchema,
	accountId: institutionalUuidSchema,
	instrumentId: institutionalUuidSchema,
	venue: z.string().min(1),
	assetClass: assetClassSchema,
	executionMode: executionModeSchema,
	maxQuantity: z.string().regex(/^\d+(\.\d+)?$/),
	maxLimitPrice: z
		.string()
		.regex(/^\d+(\.\d+)?$/)
		.optional(),
	maxSlippageBps: z.number().int().nonnegative().optional(),
	authorityEpoch: z.number().int().nonnegative(),
	riskEpoch: z.number().int().nonnegative(),
	status: permitStatusSchema,
	singleUse: z.literal(true),
	expiresAt: z.string().datetime(),
	issuedAt: z.string().datetime(),
	consumedAt: z.string().datetime().optional(),
});
export function parseExecutionPermit(input: unknown): ExecutionPermit {
	return executionPermitSchema.parse(input);
}
/** Reject permit when epochs drift after issuance. */
export function isPermitStale(
	permit: ExecutionPermit,
	currentAuthorityEpoch: number,
	currentRiskEpoch: number,
): boolean {
	return (
		permit.authorityEpoch !== currentAuthorityEpoch ||
		permit.riskEpoch !== currentRiskEpoch
	);
}

export type ExecutionPermit = z.infer<typeof executionPermitSchema>;
