import { revokePrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type { SessionRevocationPort } from "../../domain/ports/session-revoker";
import {
	loadTransitionReplay,
	recordTransitionJournal,
	transitionPrincipalState,
} from "./principal-transition";

export interface RevokePrincipalInput {
	principalId: string;
	reasonCode: string;
	actorPrincipalId?: string;
	expectedRevision?: number;
	commandId?: string;
}

export interface RevokePrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
	/** Inline session revocation, same fail-closed policy as suspend. */
	sessionRevoker?: SessionRevocationPort;
}

/**
 * R03 `RevokePrincipal`: terminal transition. Cascades to service identities,
 * their credentials and session references; REVOKED principals can never be
 * reactivated.
 */
export async function revokePrincipal(
	deps: RevokePrincipalDeps,
	input: RevokePrincipalInput,
): Promise<Principal> {
	const command = revokePrincipalCommandSchema.parse(input);
	const revokedAt = new Date();
	return deps.unitOfWork.runInTransaction(async (context) => {
		const replay = await loadTransitionReplay(
			context,
			command.commandId,
			command.principalId,
		);
		if (replay) {
			return replay;
		}
		const principal = await transitionPrincipalState(context, {
			principalId: command.principalId,
			target: "revoked",
			reasonCode: command.reasonCode,
			at: revokedAt,
			expectedRevision: command.expectedRevision,
			commandId: command.commandId,
			sessionRevocation: deps.sessionRevoker,
		});
		await recordTransitionJournal(context, {
			commandId: command.commandId,
			commandName: "RevokePrincipal",
			principal,
		});
		return principal;
	});
}
