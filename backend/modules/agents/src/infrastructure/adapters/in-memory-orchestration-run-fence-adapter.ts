import { throwAgentsError } from "../../application/errors";
import type { OrchestrationRunFencePort } from "../../domain/ports/orchestration-run-fence-port";

function revisionKey(organizationId: string, runId: string): string {
	return `${organizationId}:${runId}`;
}

export function createInMemoryOrchestrationRunFenceAdapter(
	initialRevisions: Record<string, number> = {},
): OrchestrationRunFencePort & {
	setRunRevision(input: {
		organizationId: string;
		runId: string;
		runRevision: number;
	}): void;
} {
	const revisions = new Map<string, number>(
		Object.entries(initialRevisions).map(([key, revision]) => [key, revision]),
	);

	return {
		async getRunRevision(query) {
			const key = revisionKey(query.organizationId, query.runId);
			return revisions.get(key) ?? 1;
		},

		async assertRunRevision(assertInput) {
			const current = await this.getRunRevision({
				organizationId: assertInput.organizationId,
				runId: assertInput.runId,
			});
			if (current === null || current !== assertInput.runRevision) {
				throwAgentsError(
					"AGT_GENERATION_FENCING_MISMATCH",
					`Run revision mismatch (expected ${assertInput.runRevision}, actual ${current ?? "null"})`,
				);
			}
		},

		setRunRevision(setInput) {
			revisions.set(
				revisionKey(setInput.organizationId, setInput.runId),
				setInput.runRevision,
			);
		},
	};
}
