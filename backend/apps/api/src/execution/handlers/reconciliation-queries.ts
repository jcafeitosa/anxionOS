import { listReconciliationCases } from "@anxionos/execution";
import { z } from "zod";
import type { ExecutionPluginDeps } from "../plugin";

const listReconciliationCasesQuerySchema = z.object({
	limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function handleListReconciliationCases(
	deps: ExecutionPluginDeps,
	input: { agencyId: string; query: Record<string, string | undefined> },
) {
	const { limit } = listReconciliationCasesQuerySchema.parse(input.query);
	return listReconciliationCases(
		{ reconciliationCases: deps.reconciliationCases },
		input.agencyId,
		limit,
	);
}
