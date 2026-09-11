import { z } from "zod";
import type { ExecutionPermit } from "../decisions/execution-permit";
import { isPermitStale } from "../decisions/execution-permit";
import { institutionalUuidSchema } from "../institutional-uuid";
import { EFFECT_GATE_VIOLATION, EffectGateError } from "./effect-gate";
export const taskLeaseSchema = z.object({
	leaseToken: institutionalUuidSchema,
	holderId: institutionalUuidSchema,
	expiresAt: z.string().datetime(),
});
export const CONCURRENCY_VIOLATION = {
	PERMIT_REUSED: "CONC_PERMIT_REUSED",
	LEASE_EXPIRED: "CONC_LEASE_EXPIRED",
	LEASE_HOLDER_MISMATCH: "CONC_LEASE_HOLDER_MISMATCH",
	LEASE_TOKEN_MISMATCH: "CONC_LEASE_TOKEN_MISMATCH",
	DUPLICATE_DELIVERY: "CONC_DUPLICATE_DELIVERY",
	SHUTDOWN: "CONC_SHUTDOWN",
	PERMIT_REVOKED: "CONC_PERMIT_REVOKED",
};
export class ConcurrencyBoundaryError extends Error {
	code;
	constructor(
		code:
			| ConcurrencyViolation
			| (typeof EFFECT_GATE_VIOLATION)[keyof typeof EFFECT_GATE_VIOLATION],
		message: string,
	) {
		super(message);
		this.name = "ConcurrencyBoundaryError";
		this.code = code;
	}
}
/**
 * In-memory reference fixture for race/revocation tests (P02-09 / ANX-51).
 * Not production infrastructure — documents required invariants.
 */
export class ConcurrencyFixture {
	consumedPermits = new Set();
	revokedPermits = new Set();
	idempotencyKeys = new Set();
	killSwitchActive = false;
	shutdown = false;
	authorityEpoch = 1;
	riskEpoch = 1;
	setKillSwitch(active: boolean) {
		this.killSwitchActive = active;
	}
	setShutdown(active: boolean) {
		this.shutdown = active;
	}
	bumpAuthorityEpoch() {
		this.authorityEpoch += 1;
	}
	bumpRiskEpoch() {
		this.riskEpoch += 1;
	}
	revokePermit(permitId: string) {
		this.revokedPermits.add(permitId);
	}
	assertLeaseValid(
		lease: TaskLease,
		holderId: string,
		presentedLeaseToken: string,
		now: string,
	) {
		if (lease.leaseToken !== presentedLeaseToken) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.LEASE_TOKEN_MISMATCH,
				"lease token mismatch",
			);
		}
		if (lease.holderId !== holderId) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.LEASE_HOLDER_MISMATCH,
				"lease holder mismatch",
			);
		}
		if (new Date(now) >= new Date(lease.expiresAt)) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.LEASE_EXPIRED,
				"lease expired",
			);
		}
	}
	/** At-least-once safe: duplicate idempotency key is rejected before external effect. */
	assertFirstDelivery(idempotencyKey: string) {
		if (this.idempotencyKeys.has(idempotencyKey)) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.DUPLICATE_DELIVERY,
				"duplicate idempotency key",
			);
		}
		this.idempotencyKeys.add(idempotencyKey);
	}
	/**
	 * Atomic permit consumption — returns false when another caller already consumed.
	 * Use in parallel race tests.
	 */
	tryConsumePermit(permitId: string) {
		if (this.consumedPermits.has(permitId)) {
			return false;
		}
		this.consumedPermits.add(permitId);
		return true;
	}
	/** Full dispatch gate: shutdown, kill switch, revocation, epochs, single-use permit. */
	assertDispatchAllowed(
		permit: ExecutionPermit,
		idempotencyKey: string,
		now: string,
	) {
		if (this.shutdown) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.SHUTDOWN,
				"system shutdown — no new dispatches",
			);
		}
		if (this.killSwitchActive) {
			throw new EffectGateError(
				EFFECT_GATE_VIOLATION.KILL_SWITCH,
				"kill switch active",
			);
		}
		if (this.revokedPermits.has(permit.permitId)) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.PERMIT_REVOKED,
				"permit revoked",
			);
		}
		if (new Date(now) >= new Date(permit.expiresAt)) {
			throw new EffectGateError(
				EFFECT_GATE_VIOLATION.PERMIT_EXPIRED,
				"permit expired",
			);
		}
		if (isPermitStale(permit, this.authorityEpoch, this.riskEpoch)) {
			throw new EffectGateError(
				EFFECT_GATE_VIOLATION.PERMIT_STALE,
				"permit epochs stale",
			);
		}
		this.assertFirstDelivery(idempotencyKey);
		if (!this.tryConsumePermit(permit.permitId)) {
			throw new ConcurrencyBoundaryError(
				CONCURRENCY_VIOLATION.PERMIT_REUSED,
				"permit already consumed",
			);
		}
	}
}

export type TaskLease = z.infer<typeof taskLeaseSchema>;

export type ConcurrencyViolation =
	(typeof CONCURRENCY_VIOLATION)[keyof typeof CONCURRENCY_VIOLATION];
