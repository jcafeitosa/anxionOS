import type { NodeKey, ScopeContext } from "@anxionos/contracts/graph";
import { GraphHttpError } from "./graph-http-error";

function actingScopesMatch(
	server: ScopeContext["actingScope"],
	envelope: ScopeContext["actingScope"],
) {
	return (
		server.scopeType === envelope.scopeType &&
		server.scopeId === envelope.scopeId
	);
}
export function assertEnvelopeScopeMatches(
	serverScope: ScopeContext,
	envelopeScope: ScopeContext,
): void {
	if (
		serverScope.principalId !== envelopeScope.principalId ||
		!actingScopesMatch(serverScope.actingScope, envelopeScope.actingScope)
	) {
		throw new GraphHttpError(
			"FORBIDDEN_SCOPE",
			"GraphQuery envelope scope does not match authenticated acting scope",
			{
				expectedPrincipalId: serverScope.principalId,
				expectedActingScope: serverScope.actingScope,
			},
		);
	}
}
export function isNodeReadable(scope: ScopeContext, nodeKey: NodeKey): boolean {
	const { actingScope, principalId } = scope;
	switch (actingScope.scopeType) {
		case "PLATFORM":
			return true;
		case "USER":
			return nodeKey.scopeType === "USER" && nodeKey.scopeId === principalId;
		case "AGENCY":
			return (
				nodeKey.scopeType === "AGENCY" &&
				nodeKey.scopeId === actingScope.scopeId
			);
		case "ORGANIZATION":
			return (
				nodeKey.scopeType === "ORGANIZATION" &&
				nodeKey.scopeId === actingScope.scopeId
			);
		default: {
			const unreachable = actingScope.scopeType;
			throw new GraphHttpError(
				"FORBIDDEN_SCOPE",
				`Unsupported acting scope type: ${unreachable}`,
			);
		}
	}
}
export function assertNodeReadable(
	scope: ScopeContext,
	nodeKey: NodeKey,
): void {
	const { actingScope } = scope;
	if (!isNodeReadable(scope, nodeKey)) {
		throw new GraphHttpError(
			"FORBIDDEN_SCOPE",
			"Node is outside the authenticated acting scope",
			{ nodeKey, actingScope },
		);
	}
}
