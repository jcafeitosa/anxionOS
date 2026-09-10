import type {
	ToolCallDecision,
	ToolCallEffect,
	ToolCallRequest,
} from "@anxionos/contracts/openbot";

/** Authorizes and forwards governed tool invocations (R144-01, R144-02). */
export interface ToolGatewayPort {
	authorizeToolCall(request: ToolCallRequest): Promise<ToolCallDecision>;
	forwardToolCall(input: {
		request: ToolCallRequest;
		decision: ToolCallDecision;
	}): Promise<ToolCallEffect>;
}
