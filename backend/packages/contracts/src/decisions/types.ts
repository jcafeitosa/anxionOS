import { z } from "zod";
export const executionModeSchema = z.enum(["SIMULATED", "PAPER", "REAL"]);
export const assetClassSchema = z.enum(["STOCK", "CRYPTO"]);
export const orderSideSchema = z.enum(["BUY", "SELL"]);
export const orderTypeSchema = z.enum([
	"MARKET",
	"LIMIT",
	"STOP",
	"STOP_LIMIT",
]);
export const permitStatusSchema = z.enum([
	"ACTIVE",
	"CONSUMED",
	"REVOKED",
	"EXPIRED",
	"STALE",
]);
export const DECISIONS_OWNER_DOMAIN = "decisions";
export const decisionIdSchema = z.string().regex(/^dc_dec_[0-9a-f-]{36}$/i);
export const proposalIdSchema = z.string().regex(/^dc_prp_[0-9a-f-]{36}$/i);
export const intentIdSchema = z.string().regex(/^dc_int_[0-9a-f-]{36}$/i);
/** Module command execution modes (SIMULATED|PAPER only; no REAL in P06). */
export const decisionsExecutionModeSchema = z.enum(["SIMULATED", "PAPER"]);
export const decimalAmountSchema = z.string().regex(/^\d+(\.\d+)?$/);
export const proposalKindSchema = z.enum([
	"TRADE",
	"REBALANCE",
	"WITHDRAWAL",
	"HEDGE",
]);
export const proposalStatusSchema = z.enum([
	"OPEN",
	"ACCEPTED",
	"SUPERSEDED",
	"REJECTED",
	"EXPIRED",
]);
/** Legacy decision status — kept for backward compatibility. */
export const decisionStatusSchema = z.enum([
	"PROPOSED",
	"AUTHORITY_CHECKED",
	"WAITING_APPROVAL",
	"APPROVED",
	"DENIED",
	"SUBMITTED",
]);
export const dispositionKindSchema = z.enum([
	"APPROVED",
	"DENIED",
	"REVOKED",
	"EXPIRED",
]);
export const dispositionOutcomeSchema = z.enum([
	"UPHELD",
	"OVERTURNED",
	"MODIFIED",
	"EXPIRED",
]);
export const approvalIdSchema = z.string().regex(/^dc_apr_[0-9a-f-]{36}$/i);
export const dispositionIdSchema = z.string().regex(/^dc_dsp_[0-9a-f-]{36}$/i);
export const evidenceManifestIdSchema = z
	.string()
	.regex(/^dc_emf_[0-9a-f-]{36}$/i);
export const knowledgeEvidenceIdSchema = z
	.string()
	.regex(/^kn_evd_[0-9a-f-]{36}$/i);
export const evidenceProvenanceKindSchema = z.enum([
	"DOCUMENT",
	"RETRIEVAL",
	"MANUAL",
	"RUN_ARTIFACT",
]);
export const evidenceManifestEntrySchema = z.object({
	evidenceId: knowledgeEvidenceIdSchema,
	claimTextHash: z.string().min(32).max(128),
	provenanceKind: evidenceProvenanceKindSchema,
});

/**
 * Decision Engine scope — product vs engineering decisions.
 * Distinct from governanceScopeKind (agency|organization).
 */
export const decisionScopeSchema = z.enum(["product", "engineering"]);

/**
 * Decision Engine status — superset of legacy decisionStatusSchema.
 * Legacy maps: PROPOSED→PROPOSED, AUTHORITY_CHECKED→AUTHORITY_CHECKED, SUBMITTED→SUBMITTED.
 */
export const decisionEngineStatusSchema = z.enum([
	"PROPOSED",
	"AUTHORITY_CHECKED",
	"SUBMITTED",
	"EXECUTING",
	"COMPLETED",
	"CANCELLED",
]);

export class DecisionsContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "DecisionsContractError";
	}
}

export function assertDecisionsExecutionModeSupported(mode: string): void {
	if (mode === "REAL" || mode === "REAL_EXECUTION" || mode === "LIVE") {
		throw new DecisionsContractError("DC_REAL_MODE_REJECTED");
	}
	const parsed = decisionsExecutionModeSchema.safeParse(mode);
	if (!parsed.success) {
		throw new DecisionsContractError("DC_REAL_MODE_REJECTED");
	}
}

export type ExecutionMode = z.infer<typeof executionModeSchema>;
export type AssetClass = z.infer<typeof assetClassSchema>;
export type OrderSide = z.infer<typeof orderSideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type PermitStatus = z.infer<typeof permitStatusSchema>;

export type DecisionsExecutionMode = z.infer<
	typeof decisionsExecutionModeSchema
>;
export type ProposalKind = z.infer<typeof proposalKindSchema>;
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type DecisionStatus = z.infer<typeof decisionStatusSchema>;
export type DispositionKind = z.infer<typeof dispositionKindSchema>;
export type DispositionOutcome = z.infer<typeof dispositionOutcomeSchema>;
export type DecisionScope = z.infer<typeof decisionScopeSchema>;
export type DecisionEngineStatus = z.infer<typeof decisionEngineStatusSchema>;
