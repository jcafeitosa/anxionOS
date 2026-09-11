import type { PrincipalKind, PrincipalStatus } from "../entities/principal";

/**
 * Read-only public projection of a principal for other modules
 * (R03: PrincipalLookup is the exported public port). It intentionally exposes
 * neither `authUserId` nor any credential material.
 */
export interface PrincipalLookupResult {
	principalId: string;
	kind: PrincipalKind;
	status: PrincipalStatus;
}

/**
 * R03 INV-IDN-01: a principal that is not ACTIVE must not receive new grants.
 * Consumers (governance) use this port instead of reading identity tables.
 */
export interface PrincipalLookup {
	exists(principalId: string): Promise<boolean>;
	findById(principalId: string): Promise<PrincipalLookupResult | null>;
	/** `true` only for ACTIVE principals — fail-closed for suspended/revoked. */
	isActive(principalId: string): Promise<boolean>;
}
