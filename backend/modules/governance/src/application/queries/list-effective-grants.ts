import { isGrantEffectiveAt } from "../../domain/entities/grant";
import type { Grant } from "../../domain/entities/grant";
import type { GrantRepository } from "../../domain/ports/grant-repository";

export interface ListEffectiveGrantsInput {
	scopeId: string;
	principalId: string;
	asOf?: Date;
}

export interface ListEffectiveGrantsDeps {
	grantRepository: GrantRepository;
}

export async function listEffectiveGrants(
	deps: ListEffectiveGrantsDeps,
	input: ListEffectiveGrantsInput,
): Promise<Grant[]> {
	const asOf = input.asOf ?? new Date();
	const grants = await deps.grantRepository.listEffective(
		input.scopeId,
		input.principalId,
	);
	return grants.filter((grant) => isGrantEffectiveAt(grant, asOf));
}
