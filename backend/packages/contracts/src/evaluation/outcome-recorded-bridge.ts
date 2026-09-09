import { z } from "zod";
import { outcomeRecordedPayloadSchema } from "../performance/events";
/** Bridge schema for evaluation consumer input shaped as performance.outcome.recorded.v1. */
export const performanceOutcomeRecordedBridgeSchema = outcomeRecordedPayloadSchema.pick({
    outcomeSnapshotId: true,
    organizationId: true,
    valueDate: true,
    linesSummary: true,
});
export function mapOutcomeRecordedToEvaluationInput(outcome: PerformanceOutcomeRecordedBridge, commandId: string): RecordEvaluationScoreFromOutcomeInput {
    const parsed = performanceOutcomeRecordedBridgeSchema.parse(outcome);
    return {
        commandId,
        organizationId: parsed.organizationId,
        outcomeSnapshotId: parsed.outcomeSnapshotId,
        valueDate: parsed.valueDate,
        linesSummary: parsed.linesSummary,
    };
}
/** Deterministic score from outcome lines: sum of absolute line amounts. */
export function computeOutcomeNotionalScore(linesSummary: PerformanceOutcomeRecordedBridge["linesSummary"]): string {
    let total = 0;
    for (const line of linesSummary) {
        total += Math.abs(Number.parseFloat(line.amount));
    }
    return total.toFixed(8);
}

export type PerformanceOutcomeRecordedBridge = z.infer<typeof performanceOutcomeRecordedBridgeSchema>;
export interface RecordEvaluationScoreFromOutcomeInput {
    commandId: string;
    organizationId: string;
    outcomeSnapshotId: string;
    valueDate: string;
    linesSummary: PerformanceOutcomeRecordedBridge["linesSummary"];
}
