import { randomUUID } from "node:crypto";
import type { BotRunGenerationRef } from "@anxionos/contracts/openbot";
import { throwAgentsError } from "../../application/errors";
import type { BotRunGenerationPort } from "../../domain/ports/bot-run-generation-port";
import type { OrchestrationRunFencePort } from "../../domain/ports/orchestration-run-fence-port";

interface RunGenerationState {
	nextSequence: number;
	fenceGeneration: number;
	generations: Map<string, BotRunGenerationRef>;
}

function runKey(organizationId: string, runId: string): string {
	return `${organizationId}:${runId}`;
}

function assertTenant(
	generation: BotRunGenerationRef,
	organizationId: string,
): void {
	if (generation.organizationId !== organizationId) {
		throwAgentsError(
			"AGT_TRAVERSAL_DENIED",
			`Generation tenant mismatch: ${generation.generationId}`,
		);
	}
}

export function createSandboxBotRunGenerationAdapter(input: {
	runFence: OrchestrationRunFencePort;
}): BotRunGenerationPort {
	const runs = new Map<string, RunGenerationState>();
	const abortedGenerationIds = new Set<string>();

	function getRunState(key: string): RunGenerationState {
		let state = runs.get(key);
		if (!state) {
			state = {
				nextSequence: 0,
				fenceGeneration: 0,
				generations: new Map(),
			};
			runs.set(key, state);
		}
		return state;
	}

	return {
		async acquireGeneration(acquireInput) {
			await input.runFence.assertRunRevision({
				organizationId: acquireInput.organizationId,
				runId: acquireInput.runId,
				runRevision: acquireInput.runRevision,
			});

			const key = runKey(acquireInput.organizationId, acquireInput.runId);
			const state = getRunState(key);
			const generationSequence = state.nextSequence + 1;
			state.nextSequence = generationSequence;

			const generation: BotRunGenerationRef = {
				generationId: randomUUID(),
				organizationId: acquireInput.organizationId,
				agentId: acquireInput.agentId,
				runId: acquireInput.runId,
				runRevision: acquireInput.runRevision,
				generationSequence,
				status: "active",
				abortToken: randomUUID(),
			};
			state.generations.set(generation.generationId, generation);
			return generation;
		},

		async abortGeneration(abortInput) {
			const existing = await this.getGeneration({
				generationId: abortInput.generationId,
				organizationId: abortInput.organizationId,
			});
			if (!existing) {
				throwAgentsError(
					"AGT_TRAVERSAL_DENIED",
					`Bot run generation not found: ${abortInput.generationId}`,
				);
			}

			if (existing.status === "aborted") {
				return { generation: existing, idempotentReplay: true };
			}

			if (existing.abortToken !== abortInput.abortToken) {
				throwAgentsError(
					"AGT_GENERATION_FENCING_MISMATCH",
					`Abort token mismatch for generation ${abortInput.generationId}`,
				);
			}

			await input.runFence.assertRunRevision({
				organizationId: abortInput.organizationId,
				runId: existing.runId,
				runRevision: abortInput.runRevision,
			});

			if (existing.runRevision !== abortInput.runRevision) {
				throwAgentsError(
					"AGT_GENERATION_FENCING_MISMATCH",
					`Run revision mismatch for generation ${abortInput.generationId}`,
				);
			}

			const key = runKey(existing.organizationId, existing.runId);
			const state = getRunState(key);
			state.fenceGeneration += 1;

			const aborted: BotRunGenerationRef = {
				...existing,
				status: "aborted",
			};
			state.generations.set(aborted.generationId, aborted);
			abortedGenerationIds.add(aborted.generationId);
			return { generation: aborted, idempotentReplay: false };
		},

		async releaseGeneration(releaseInput) {
			const existing = await this.getGeneration({
				generationId: releaseInput.generationId,
				organizationId: releaseInput.organizationId,
			});
			if (!existing) {
				throwAgentsError(
					"AGT_TRAVERSAL_DENIED",
					`Bot run generation not found: ${releaseInput.generationId}`,
				);
			}

			if (existing.status === "released" || existing.status === "aborted") {
				return { generation: existing, idempotentReplay: true };
			}

			const key = runKey(existing.organizationId, existing.runId);
			const state = getRunState(key);
			const released: BotRunGenerationRef = {
				...existing,
				status: "released",
			};
			state.generations.set(released.generationId, released);
			return { generation: released, idempotentReplay: false };
		},

		async getGeneration(query) {
			for (const state of runs.values()) {
				const existing = state.generations.get(query.generationId);
				if (existing) {
					assertTenant(existing, query.organizationId);
					return existing;
				}
			}
			return null;
		},

		isGenerationAborted(generationId: string): boolean {
			return abortedGenerationIds.has(generationId);
		},
	};
}
