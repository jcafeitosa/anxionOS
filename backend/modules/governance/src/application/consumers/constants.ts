import { OWNER_AUTHORITY_CAPABILITIES } from "@anxionos/contracts/governance";

/**
 * CAP-B01 — baseline Owner capabilities issued on membership.activated (R03).
 *
 * ANX-466 (G5 FURO 1): e' a **mesma** lista que `hasOwnerAuthority` usa
 * (`OWNER_AUTHORITY_CAPABILITIES`, dona em `@anxionos/contracts/governance`) e
 * a mesma que a classe administrativa deriva. Uma fonte so': enquanto houver
 * duas listas, um token de leitura escapa como autoridade de owner.
 */
export const OWNER_BASELINE_CAPABILITIES = OWNER_AUTHORITY_CAPABILITIES;
export const GOVERNANCE_ORGANIZATIONS_CONSUMER_NAME =
	"governance:organizations:v1";
