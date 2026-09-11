import { reactivatePrincipalCommandSchema } from "@anxionos/contracts/identity";
import type { Principal } from "../../domain/entities/principal";
import { createPrincipalReactivatedEvent } from "../../domain/events/identity-events";
import { revisionMatches } from "../../domain/policies/principal-lifecycle";
import type { IdentityUnitOfWork } from "../../domain/ports/identity-unit-of-work";
import type { PrincipalRepository } from "../../domain/ports/principal-repository";
import { throwIdentityError } from "../errors";
import {
	loadTransitionReplay,
	recordTransitionJournal,
} from "./principal-transition";

export interface ReactivatePrincipalInput {
	principalId: string;
	actorPrincipalId?: string;
	expectedRevision?: number;
	commandId?: string;
}

export interface ReactivatePrincipalDeps {
	repository: PrincipalRepository;
	unitOfWork: IdentityUnitOfWork;
}

/** `suspended → active`. REVOKED is terminal, so reactivation is refused there. */
export async function reactivatePrincipal(
	deps: ReactivatePrincipalDeps,
	input: ReactivatePrincipalInput,
): Promise<Principal> {
	const command = reactivatePrincipalCommandSchema.parse(input);
	const reactivatedAt = new Date();
	return deps.unitOfWork.runInTransaction(async (context) => {
		const replay = await loadTransitionReplay(
			context,
			command.commandId,
			command.principalId,
		);
		if (replay) {
			return replay;
		}
		const current = await context.principalRepository.findById(
			command.principalId,
		);
		if (!current) {
			throwIdentityError("IDN_PRINCIPAL_NOT_FOUND", "Principal not found");
		}
		if (current.status === "active") {
			return current;
		}
		if (current.status === "revoked") {
			throwIdentityError(
				"IDN_PRINCIPAL_REVOKED",
				"Revoked principal cannot be reactivated",
			);
		}
		if (!revisionMatches(current.revision, command.expectedRevision)) {
			throwIdentityError(
				"IDN_REVISION_CONFLICT",
				`Principal revision ${current.revision} does not match expected ${command.expectedRevision}`,
			);
		}
		const principal = await context.principalRepository.reactivate(
			current.id,
			command.expectedRevision,
		);
		if (!principal) {
			throwIdentityError(
				"IDN_REVISION_CONFLICT",
				"Principal changed concurrently during reactivation",
			);
		}
		await context.publishEvents([
			createPrincipalReactivatedEvent({
				principalId: principal.id,
				reactivatedAt: reactivatedAt.toISOString(),
				actorPrincipalId: command.actorPrincipalId,
				revision: principal.revision,
			}),
		]);
		await recordTransitionJournal(context, {
			commandId: command.commandId,
			commandName: "ReactivatePrincipal",
			principal,
		});
		return principal;
	});
}
