import type {
	NodeKey,
	ScopeContext,
	T01Input,
	T01Output,
	T03Output,
} from "@anxionos/contracts/graph";
import type { GraphNodeRecord } from "../../domain/ports/graph-store";
import { isNodeReadable } from "../http/scope-enforcement";
import {
	grantPayloadToTemporalInterval,
	isBitemporallyActive,
} from "./t02-temporal-evaluation";

export const GRAPH_T01_DENY_REASONS = {
	NO_GRANT_MATCH: "GRAPH_T01_NO_GRANT_MATCH",
	SCOPE_MISMATCH: "GRAPH_T01_SCOPE_MISMATCH",
	STALE_AUTHORITY_EPOCH: "GRAPH_T01_STALE_AUTHORITY_EPOCH",
	TEMPORAL_INACTIVE: "GRAPH_T01_TEMPORAL_INACTIVE",
};
function parsePayloadField(payload: Record<string, unknown>, field: string) {
	const value = payload[field];
	if (typeof value === "string" || typeof value === "number") {
		return value;
	}
	return undefined;
}
/** Resolves the grant authority scope from acting scope and resource tenancy. */
export function resolveGrantScope(
	scope: ScopeContext,
	resourceNodeKey: NodeKey,
): GrantScope {
	if (scope.actingScope.scopeType === "AGENCY") {
		return {
			scopeType: "AGENCY",
			scopeId: scope.actingScope.scopeId,
		};
	}
	if (resourceNodeKey.scopeType === "AGENCY") {
		return {
			scopeType: "AGENCY",
			scopeId: resourceNodeKey.scopeId,
		};
	}
	return {
		scopeType: scope.actingScope.scopeType,
		scopeId: scope.actingScope.scopeId,
	};
}
export function grantMatchesT01(
	grant: GraphNodeRecord,
	actorId: string,
	action: string,
	expectedAuthorityEpoch?: number,
): boolean {
	if (grant.nodeKey.type !== "Grant" || grant.status !== "active") {
		return false;
	}
	const granteePrincipalId = parsePayloadField(
		grant.payload,
		"granteePrincipalId",
	);
	const capability = parsePayloadField(grant.payload, "capability");
	if (granteePrincipalId !== actorId || capability !== action) {
		return false;
	}
	if (expectedAuthorityEpoch !== undefined) {
		const authorityEpoch = parsePayloadField(grant.payload, "authorityEpoch");
		if (authorityEpoch !== expectedAuthorityEpoch) {
			return false;
		}
	}
	return true;
}
export function filterMatchingGrants(
	grants: GraphNodeRecord[],
	actorId: string,
	action: string,
	expectedAuthorityEpoch?: number,
): GraphNodeRecord[] {
	return grants.filter((grant) =>
		grantMatchesT01(grant, actorId, action, expectedAuthorityEpoch),
	);
}

export function filterGrantsByTemporalContext(
	grants: GraphNodeRecord[],
	validAtIso: string,
	knownAtIso?: string,
): GraphNodeRecord[] {
	const validAt = new Date(validAtIso);
	const knownAt = knownAtIso ? new Date(knownAtIso) : validAt;
	return grants.filter((grant) =>
		isBitemporallyActive(
			grantPayloadToTemporalInterval(grant.payload),
			validAt,
			knownAt,
		),
	);
}

export function evaluateT01Grants(
	input: T01GrantEvaluationInput,
	grants: GraphNodeRecord[],
): T01GrantEvaluationResult {
	const { scope, params, knownAt } = input;
	if (!isNodeReadable(scope, params.resourceNodeKey)) {
		return {
			output: {
				decision: "DENY",
				denyReasons: [GRAPH_T01_DENY_REASONS.SCOPE_MISMATCH],
				authorityEpoch: params.expectedAuthorityEpoch,
				riskEpoch: params.expectedRiskEpoch,
			},
			projectionGeneration: 0,
		};
	}
	const grantScope = resolveGrantScope(scope, params.resourceNodeKey);
	const scopedGrants = grants.filter(
		(grant) =>
			grant.nodeKey.scopeType === grantScope.scopeType &&
			grant.nodeKey.scopeId === grantScope.scopeId,
	);
	const capabilityMatched = filterMatchingGrants(
		scopedGrants,
		params.actorId,
		params.action,
		params.expectedAuthorityEpoch,
	);
	const matched = filterGrantsByTemporalContext(
		capabilityMatched,
		params.validAt,
		knownAt,
	);
	if (capabilityMatched.length > 0 && matched.length === 0) {
		return {
			output: {
				decision: "DENY",
				denyReasons: [GRAPH_T01_DENY_REASONS.TEMPORAL_INACTIVE],
				authorityEpoch: params.expectedAuthorityEpoch,
				riskEpoch: params.expectedRiskEpoch,
			},
			projectionGeneration: 0,
		};
	}
	if (matched.length === 0) {
		return {
			output: {
				decision: "DENY",
				denyReasons: [GRAPH_T01_DENY_REASONS.NO_GRANT_MATCH],
				authorityEpoch: params.expectedAuthorityEpoch,
				riskEpoch: params.expectedRiskEpoch,
			},
			projectionGeneration: 0,
		};
	}
	const grantIds = matched.map((grant) => grant.nodeKey.id);
	const authorityEpoch =
		params.expectedAuthorityEpoch ??
		parsePayloadField(matched[0].payload, "authorityEpoch");
	const projectionGeneration = matched.reduce(
		(max, grant) => Math.max(max, grant.projectionGeneration),
		0,
	);
	return {
		output: {
			decision: "ALLOW",
			authorityEpoch:
				typeof authorityEpoch === "number"
					? authorityEpoch
					: Number(authorityEpoch),
			riskEpoch: params.expectedRiskEpoch,
			proof: { grantIds },
		},
		projectionGeneration,
	};
}
export function toT03Output(t01: T01Output): T03Output {
	const stage = t01.decision === "ALLOW" ? "grant_match" : "deny_default";
	const message =
		t01.decision === "ALLOW"
			? "Active grant matched actor and capability"
			: (t01.denyReasons?.[0] ?? "No matching active grant");
	return {
		decision: t01.decision,
		authorityEpoch: t01.authorityEpoch,
		riskEpoch: t01.riskEpoch,
		reasonTree: [
			{
				stage,
				decision: t01.decision,
				message,
			},
		],
	};
}

export interface GrantScope {
	scopeType: string;
	scopeId: string;
}

export interface T01GrantEvaluationInput {
	scope: ScopeContext;
	params: T01Input;
	knownAt?: string;
}

export interface T01GrantEvaluationResult {
	output: T01Output;
	projectionGeneration: number;
}
/** Resolves the grant authority scope from acting scope and resource tenancy. */
