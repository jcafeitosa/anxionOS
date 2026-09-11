import type { ListReconciliationCasesResponse } from "@anxionos/contracts/execution";
import { listReconciliationCasesResponseSchema } from "@anxionos/contracts/execution";
import type { ExecutionReconciliationCaseRepository } from "../../domain/ports/execution-unit-of-work";
import { toReconciliationCaseSnapshot } from "./query-support";

export interface ListReconciliationCasesDeps {
	reconciliationCases: ExecutionReconciliationCaseRepository;
}

export async function listReconciliationCases(
	deps: ListReconciliationCasesDeps,
	organizationId: string,
	limit?: number,
): Promise<ListReconciliationCasesResponse> {
	const records = await deps.reconciliationCases.listByOrganizationId(
		organizationId,
		limit,
	);
	return listReconciliationCasesResponseSchema.parse({
		reconciliationCases: records.map(toReconciliationCaseSnapshot),
	});
}
