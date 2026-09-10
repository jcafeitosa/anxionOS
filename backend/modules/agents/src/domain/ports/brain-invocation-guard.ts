export interface BrainInvocationGuardPort {
	assertInvokeAllowed(input: {
		agencyId: string;
		agentId: string;
		capabilityId: string;
	}): Promise<void>;
}
