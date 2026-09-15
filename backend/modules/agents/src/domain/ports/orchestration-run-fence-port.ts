/**
 * Read-only orchestration Run revision for generation fencing (D-AGT-003).
 * The orchestration owner supplies this port through the composition root;
 * agents must not construct local state as run authority.
 */
export interface OrchestrationRunFencePort {
	getRunRevision(input: {
		organizationId: string;
		runId: string;
	}): Promise<number | null>;
	assertRunRevision(input: {
		organizationId: string;
		runId: string;
		runRevision: number;
	}): Promise<void>;
}
