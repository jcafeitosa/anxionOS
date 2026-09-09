import type { Principal } from "../../domain/entities/principal";
import type { PrincipalCommandsPort } from "../../domain/ports/principal-commands";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";

export interface SuspendPrincipalInput {
	principalId: string;
	reasonCode: string;
}

export interface SuspendPrincipalDeps {
	repository: PrincipalRepository;
	principalCommands: PrincipalCommandsPort;
}

export async function suspendPrincipal(
	deps: SuspendPrincipalDeps,
	input: SuspendPrincipalInput,
): Promise<Principal> {
	const existing = await deps.repository.findById(input.principalId);
	if (!existing) {
		throw new Error("PRINCIPAL_NOT_FOUND");
	}
	if (existing.status === "suspended") {
		return existing;
	}
	return deps.principalCommands.suspend(input.principalId, input.reasonCode);
}
