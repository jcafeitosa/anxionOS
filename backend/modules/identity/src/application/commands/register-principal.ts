import type { Principal } from "../../domain/entities/principal";
import type { PrincipalCommandsPort } from "../../domain/ports/principal-commands";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";

export interface RegisterPrincipalInput {
	authUserId: string;
	email: string;
}

export interface RegisterPrincipalDeps {
	repository: PrincipalRepository;
	principalCommands: PrincipalCommandsPort;
}

export async function registerPrincipal(
	deps: RegisterPrincipalDeps,
	input: RegisterPrincipalInput,
): Promise<Principal> {
	const existing = await deps.repository.findByAuthUserId(input.authUserId);
	if (existing) {
		return existing;
	}
	return deps.principalCommands.register(input);
}
