import type { ChangeProposalKind } from "@anxionos/contracts/governance";
import { OWNER_BASELINE_CAPABILITIES } from "../../application/consumers/constants";
import type { Grant } from "../entities/grant";

const OWNER_CAPABILITIES = new Set<string>(OWNER_BASELINE_CAPABILITIES);

export function requiresOwnerApproval(kind: ChangeProposalKind): boolean {
	return kind === "INSTITUTIONAL" || kind === "HIERARCHY_MODE";
}

export function hasOwnerAuthority(grants: Grant[]): boolean {
	return grants.some(
		(grant) => grant.status === "active" && OWNER_CAPABILITIES.has(grant.capability),
	);
}
