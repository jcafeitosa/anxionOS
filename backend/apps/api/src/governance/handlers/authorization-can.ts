import { institutionalUuidSchema } from "@anxionos/contracts";
import { AppError } from "@anxionos/contracts/errors";
import { T01_INPUT_SCHEMA } from "@anxionos/contracts/graph";
import { z } from "zod";
import type { GovernancePluginDeps } from "../plugin";

export const authorizationCanBodySchema = T01_INPUT_SCHEMA.extend({
	agencyId: institutionalUuidSchema,
}).strict();

export async function handleAuthorizationCan(
	deps: GovernancePluginDeps,
	input: { principalId: string; body: unknown },
) {
	const parsed = authorizationCanBodySchema.parse(input.body);
	if (parsed.actorId !== input.principalId) {
		throw AppError.forbidden("actorId must match authenticated principal");
	}
	const { agencyId, ...params } = parsed;
	return deps.traversalEvaluator.evaluateT01({
		scope: {
			principalId: input.principalId,
			actingScope: {
				scopeType: "AGENCY",
				scopeId: agencyId,
			},
		},
		params,
		authorityScopeId: agencyId,
	});
}
