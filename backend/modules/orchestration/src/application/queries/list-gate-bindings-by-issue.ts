import type { GateBindingV1 } from "@anxionos/contracts/orchestration";
import type { GateBindingRepository } from "../../domain/ports/gate-binding-repository";
import { toGateBindingV1 } from "../dto-mappers";

export interface ListGateBindingsByIssueDeps {
	gateBindingRepository: GateBindingRepository;
}

export interface ListGateBindingsByIssueInput {
	organizationId: string;
	issueIdentifier: string;
}

export interface ListGateBindingsByIssueResult {
	bindings: GateBindingV1[];
}

export async function listGateBindingsByIssue(
	deps: ListGateBindingsByIssueDeps,
	input: ListGateBindingsByIssueInput,
): Promise<ListGateBindingsByIssueResult> {
	const bindings = await deps.gateBindingRepository.listByIssue(
		input.organizationId,
		input.issueIdentifier,
	);
	return {
		bindings: bindings
			.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())
			.map(toGateBindingV1),
	};
}
