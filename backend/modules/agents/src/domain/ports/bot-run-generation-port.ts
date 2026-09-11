import type { BotRunGenerationRef } from "@anxionos/contracts/openbot";

/** Bot execution generation lifecycle — does not persist orchestration Run state (R144-08). */
export interface BotRunGenerationPort {
	acquireGeneration(input: {
		organizationId: string;
		agentId: string;
		runId: string;
		runRevision: number;
	}): Promise<BotRunGenerationRef>;
	abortGeneration(input: {
		generationId: string;
		organizationId: string;
		abortToken: string;
		runRevision: number;
	}): Promise<{ generation: BotRunGenerationRef; idempotentReplay: boolean }>;
	releaseGeneration(input: {
		generationId: string;
		organizationId: string;
	}): Promise<{ generation: BotRunGenerationRef; idempotentReplay: boolean }>;
	getGeneration(input: {
		generationId: string;
		organizationId: string;
	}): Promise<BotRunGenerationRef | null>;
	isGenerationAborted(generationId: string): boolean;
}
