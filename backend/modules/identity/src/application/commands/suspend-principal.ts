import { suspendPrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import type { SessionRevocationPort } from "../../domain/ports/session-revoker";
import {
	loadTransitionReplay,
	recordTransitionJournal,
	transitionPrincipalState,
} from "./principal-transition";

export interface SuspendPrincipalInput {
	principalId: string;
	reasonCode: string;
	actorPrincipalId?: string;
	expectedRevision?: number;
	commandId?: string;
}

export interface SuspendPrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
	/** ANX-235: inline revoke closes the session window when NATS is disabled. */
	sessionRevoker?: SessionRevocationPort;
}

export async function suspendPrincipal(
	deps: SuspendPrincipalDeps,
	input: SuspendPrincipalInput,
): Promise<Principal> {
	const command = suspendPrincipalCommandSchema.parse(input);
	const suspendedAt = new Date();
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
			target: "suspended",
			reasonCode: command.reasonCode,
			at: suspendedAt,
			expectedRevision: command.expectedRevision,
			commandId: command.commandId,
			sessionRevocation: deps.sessionRevoker,
		});
		await recordTransitionJournal(context, {
			commandId: command.commandId,
			commandName: "SuspendPrincipal",
			principal,
		});
		return principal;
	});
}
