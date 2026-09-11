import {
	type ChangeProposalKind,
	OWNER_AUTHORITY_CAPABILITIES,
} from "@anxionos/contracts/governance";
import type { Grant } from "../entities/grant";

/**
 * ANX-466 (G5 FURO 1): a autoridade de owner vem da fonte unica em contrato
 * (`OWNER_AUTHORITY_CAPABILITIES`), a mesma que a classe administrativa e a
 * baseline CAP-B01 usam. `owner.read` sozinho ja' aprova proposta
 * INSTITUTIONAL/HIERARCHY_MODE, logo tambem e' autoridade administrativa.
 */
const OWNER_CAPABILITIES = new Set<string>(OWNER_AUTHORITY_CAPABILITIES);

export function requiresOwnerApproval(kind: ChangeProposalKind): boolean {
	return kind === "INSTITUTIONAL" || kind === "HIERARCHY_MODE";
}

export function hasOwnerAuthority(grants: Grant[]): boolean {
	return grants.some(
		(grant) =>
			grant.status === "active" && OWNER_CAPABILITIES.has(grant.capability),
	);
}
