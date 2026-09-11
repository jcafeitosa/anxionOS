import {
	createGovernanceDb,
	createGovernanceUnitOfWork,
	createGraphT01TraversalEvaluator,
} from "@anxionos/governance";
import { createIdentityDb } from "@anxionos/identity";
import { createIdentityPrincipalLookup } from "@anxionos/organizations";
import type { Pool } from "pg";
import type { GovernancePluginDeps } from "./plugin";

export type GovernanceApiRuntime = Omit<
	GovernancePluginDeps,
	"auth" | "membershipRepository" | "scopedPool"
>;

export function createGovernanceApiRuntime(pool: Pool): GovernanceApiRuntime {
	const governanceDb = createGovernanceDb(pool);
	const identity = createIdentityDb(pool);
	const traversalEvaluator = createGraphT01TraversalEvaluator({
		authorityEpochStore: governanceDb.authorityEpochStore,
		graphEvaluator: {
			async evaluate() {
				throw new Error("graph kernel not configured");
			},
		},
	});
	const runtime = {
		grantRepository: governanceDb.grantRepository,
		changeProposalRepository: governanceDb.changeProposalRepository,
		autonomyAssignmentRepository: governanceDb.autonomyAssignmentRepository,
		commandJournal: governanceDb.commandJournal,
		unitOfWork: createGovernanceUnitOfWork(pool),
		principalLookup: createIdentityPrincipalLookup(pool),
		identityRepository: identity.repository,
		traversalEvaluator,
	};
	return runtime;
}
