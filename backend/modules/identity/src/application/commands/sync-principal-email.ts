import type { Principal } from "../../domain/entities/principal";
import type { PrincipalCommandsPort } from "../../domain/ports/principal-commands";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";

export interface SyncPrincipalEmailInput {
	principalId: string;
	email: string;
}

export interface SyncPrincipalEmailDeps {
	repository: PrincipalRepository;
	principalCommands: PrincipalCommandsPort;
}

/** P1 sketch — updates email and emits identity.principal.email_updated.v1. */
export async function syncPrincipalEmail(
	deps: SyncPrincipalEmailDeps,
	input: SyncPrincipalEmailInput,
): Promise<Principal> {
	const existing = await deps.repository.findById(input.principalId);
	if (!existing) {
		throw new Error("PRINCIPAL_NOT_FOUND");
	}
	if (existing.email === input.email) {
		return existing;
	}
	return deps.principalCommands.syncEmail(input.principalId, input.email);
}
