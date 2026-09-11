import { z } from "zod";
import {
	executionPermitSchema,
	isPermitStale,
} from "../decisions/execution-permit";
import { institutionalUuidSchema } from "../institutional-uuid";
export const orderLifecycleStateSchema = z.enum([
	"PROPOSED",
	"AUTHORIZED",
	"RISK_CHECKED",
	"WAITING_APPROVAL",
	"PERMITTED",
	"DISPATCHED",
	"CONFIRMED",
	"FAILED",
	"UNKNOWN",
	"RECONCILING",
	"CLOSED",
]);
export const effectClassSchema = z.enum([
	"READ_ONLY",
	"REVERSIBLE",
	"EXTERNAL_EFFECT",
	"IRREVERSIBLE",
]);
export const killSwitchScopeSchema = z.enum([
	"GLOBAL",
	"AGENCY",
	"ASSET_CLASS",
	"STRATEGY",
	"VENUE",
]);
export const effectGateContextSchema = z.object({
	permit: executionPermitSchema,
	currentAuthorityEpoch: z.number().int().nonnegative(),
	currentRiskEpoch: z.number().int().nonnegative(),
	killSwitchActive: z.boolean(),
	permitRevoked: z.boolean(),
	policyStale: z.boolean(),
	effectClass: effectClassSchema,
	now: z.string().datetime(),
});
export const reconcileUnknownCommandSchema = z.object({
	orderId: institutionalUuidSchema,
	idempotencyKey: institutionalUuidSchema,
	venueStatusQueryId: z.string().min(1),
	decision: z.enum(["CONFIRM_EXISTING", "MARK_FAILED", "KEEP_RECONCILING"]),
	rationale: z.string().min(1).max(2000),
});
export const EFFECT_GATE_VIOLATION = {
	KILL_SWITCH: "EFFECT_KILL_SWITCH",
	PERMIT_REVOKED: "EFFECT_PERMIT_REVOKED",
	PERMIT_STALE: "EFFECT_PERMIT_STALE",
	PERMIT_EXPIRED: "EFFECT_PERMIT_EXPIRED",
	PERMIT_NOT_ACTIVE: "EFFECT_PERMIT_NOT_ACTIVE",
	POLICY_STALE: "EFFECT_POLICY_STALE",
	EXTERNAL_WITHOUT_GATE: "EFFECT_EXTERNAL_WITHOUT_GATE",
	BLIND_RETRY: "EFFECT_BLIND_RETRY",
	INVALID_TRANSITION: "EFFECT_INVALID_TRANSITION",
};
export class EffectGateError extends Error {
	code;
	constructor(
		code: (typeof EFFECT_GATE_VIOLATION)[keyof typeof EFFECT_GATE_VIOLATION],
		message: string,
	) {
		super(message);
		this.name = "EffectGateError";
		this.code = code;
	}
}
type OrderLifecycleState = z.infer<typeof orderLifecycleStateSchema>;
const ALLOWED_TRANSITIONS: Record<
	OrderLifecycleState,
	readonly OrderLifecycleState[]
> = {
	PROPOSED: ["AUTHORIZED", "CLOSED"],
	AUTHORIZED: ["RISK_CHECKED", "CLOSED"],
	RISK_CHECKED: ["WAITING_APPROVAL", "CLOSED"],
	WAITING_APPROVAL: ["PERMITTED", "CLOSED"],
	PERMITTED: ["DISPATCHED", "CLOSED"],
	DISPATCHED: ["CONFIRMED", "FAILED", "UNKNOWN"],
	CONFIRMED: ["CLOSED"],
	FAILED: ["CLOSED"],
	UNKNOWN: ["RECONCILING"],
	RECONCILING: ["CONFIRMED", "FAILED", "UNKNOWN", "CLOSED"],
	CLOSED: [],
};
export function assertValidLifecycleTransition(
	from: OrderLifecycleState,
	to: OrderLifecycleState,
): void {
	const allowed = ALLOWED_TRANSITIONS[from];
	if (!allowed.includes(to)) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.INVALID_TRANSITION,
			`invalid transition ${from} -> ${to}`,
		);
	}
}
/** Blocks external dispatch unless permit, epochs, policy and kill switch allow. */
export function assertEffectGateOpen(ctx: EffectGateContext): void {
	if (ctx.killSwitchActive) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.KILL_SWITCH,
			"kill switch active",
		);
	}
	if (ctx.permitRevoked) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.PERMIT_REVOKED,
			"permit revoked",
		);
	}
	if (ctx.policyStale) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.POLICY_STALE,
			"risk or governance policy stale",
		);
	}
	if (ctx.permit.status !== "ACTIVE") {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.PERMIT_NOT_ACTIVE,
			`permit status is ${ctx.permit.status}`,
		);
	}
	if (new Date(ctx.now) >= new Date(ctx.permit.expiresAt)) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.PERMIT_EXPIRED,
			"permit expired",
		);
	}
	if (
		isPermitStale(ctx.permit, ctx.currentAuthorityEpoch, ctx.currentRiskEpoch)
	) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.PERMIT_STALE,
			"permit epochs stale",
		);
	}
	if (
		(ctx.effectClass === "EXTERNAL_EFFECT" ||
			ctx.effectClass === "IRREVERSIBLE") &&
		ctx.permit.singleUse !== true
	) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.EXTERNAL_WITHOUT_GATE,
			"external effect requires single-use permit",
		);
	}
}
/** UNKNOWN and RECONCILING forbid blind retry without explicit reconcile decision. */
export function assertNoBlindRetry(
	currentState: OrderLifecycleState,
	hasReconcileDecision: boolean,
): void {
	if (
		(currentState === "UNKNOWN" || currentState === "RECONCILING") &&
		!hasReconcileDecision
	) {
		throw new EffectGateError(
			EFFECT_GATE_VIOLATION.BLIND_RETRY,
			"reconcile before retry when state is UNKNOWN/RECONCILING",
		);
	}
}

export type EffectClass = z.infer<typeof effectClassSchema>;
export type EffectGateContext = z.infer<typeof effectGateContextSchema>;
export type ReconcileUnknownCommand = z.infer<
	typeof reconcileUnknownCommandSchema
>;

export type EffectGateViolation =
	(typeof EFFECT_GATE_VIOLATION)[keyof typeof EFFECT_GATE_VIOLATION];
