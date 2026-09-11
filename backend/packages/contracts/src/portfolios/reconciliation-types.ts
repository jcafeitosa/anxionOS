import { z } from "zod";

export const positionReconciliationCaseKindSchema = z.enum([
	"POSITION_VS_FILL",
	"POSITION_VS_LEDGER",
	"VALUATION_STALE",
]);

export const positionReconciliationCaseStatusSchema = z.enum([
	"OPEN",
	"INVESTIGATING",
	"RESOLVED",
	"ESCALATED",
]);

export type PositionReconciliationCaseKind = z.infer<
	typeof positionReconciliationCaseKindSchema
>;

export type PositionReconciliationCaseStatus = z.infer<
	typeof positionReconciliationCaseStatusSchema
>;

export function cashInstrumentId(baseCurrency: string): string {
	const normalized = baseCurrency.trim().toUpperCase();
	const suffix = normalized
		.split("")
		.map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 12)
		.padEnd(12, "0");
	return `00000000-0000-4000-8000-${suffix}`;
}
