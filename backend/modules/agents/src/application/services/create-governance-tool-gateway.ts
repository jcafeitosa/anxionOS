import type {
	ToolCallDecision,
	ToolCallEffect,
	ToolCallRequest,
} from "@anxionos/contracts/openbot";
import { OPENBOT_TOOL_INVOKE_CAPABILITY } from "@anxionos/contracts/openbot";
import {
	type AutonomyAssignmentRepository,
	evaluateAutonomyCapability,
	type GrantRepository,
} from "@anxionos/governance";
import type { ToolGatewayPort } from "../../domain/ports/tool-gateway-port";

const GRANT_MISSING_RULE_ID = "governance.grant.missing";
const GRANT_ALLOWED_RULE_ID = "governance.grant.allowed";

export interface GovernanceToolGatewayDeps {
	autonomyAssignmentRepository: AutonomyAssignmentRepository;
	grantRepository: GrantRepository;
}

export interface CreateGovernanceToolGatewayOptions {
	deps: GovernanceToolGatewayDeps;
	/** Forwards ALLOW decisions after grant verification (R144-01). */
	forwarder: Pick<ToolGatewayPort, "forwardToolCall">;
}

function denyDecision(
	request: ToolCallRequest,
	reason: string,
): ToolCallDecision {
	return {
		requestId: request.requestId,
		decision: "DENY",
		ruleId: GRANT_MISSING_RULE_ID,
		reason,
	};
}

function allowDecision(request: ToolCallRequest): ToolCallDecision {
	return {
		requestId: request.requestId,
		decision: "ALLOW",
		ruleId: GRANT_ALLOWED_RULE_ID,
	};
}

export function createGovernanceToolGateway(
	options: CreateGovernanceToolGatewayOptions,
): ToolGatewayPort {
	const { deps, forwarder } = options;

	return {
		async authorizeToolCall(
			request: ToolCallRequest,
		): Promise<ToolCallDecision> {
			const scopeId = request.organizationId;
			const result = await evaluateAutonomyCapability(deps, {
				scopeId,
				subjectAgentId: request.agentId,
				capability: OPENBOT_TOOL_INVOKE_CAPABILITY,
			});
			if (!result.allowed) {
				return denyDecision(
					request,
					result.reason ?? "Tool invocation denied by governance",
				);
			}
			return allowDecision(request);
		},
		async forwardToolCall(input: {
			request: ToolCallRequest;
			decision: ToolCallDecision;
		}): Promise<ToolCallEffect> {
			if (input.decision.decision !== "ALLOW") {
				throw new Error("forward blocked when decision is not ALLOW");
			}
			return forwarder.forwardToolCall(input);
		},
	};
}
