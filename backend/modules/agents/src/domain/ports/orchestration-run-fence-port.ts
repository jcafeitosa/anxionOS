/** Read-only orchestration Run revision for generation fencing (D-AGT-003). */
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
