import type { z } from "zod";
import { certificationIssuedPayloadSchema } from "./events";

/** Bridge schema for strategies consumer input shaped as evaluation.certification.issued.v1. */
export const evaluationCertificationIssuedBridgeSchema =
	certificationIssuedPayloadSchema;

export type EvaluationCertificationIssuedBridge = z.infer<
	typeof evaluationCertificationIssuedBridgeSchema
>;

export interface PromoteStrategyVersionCertifiedInput {
	commandId: string;
	organizationId: string;
	certificationId: string;
	strategyId: string;
	strategyVersionId: string;
	issuedAt: string;
}

export function mapCertificationIssuedToPromotionInput(
	certification: EvaluationCertificationIssuedBridge,
	eventId: string,
): PromoteStrategyVersionCertifiedInput {
	const parsed = evaluationCertificationIssuedBridgeSchema.parse(certification);
	if (parsed.subjectType !== "strategy_version") {
		throw new Error("EVL_SUBJECT_INVALID");
	}
	return {
		commandId: eventId,
		organizationId: parsed.organizationId,
		certificationId: parsed.certificationId,
		strategyId: parsed.strategyId,
		strategyVersionId: parsed.strategyVersionId,
		issuedAt: parsed.issuedAt,
	};
}
