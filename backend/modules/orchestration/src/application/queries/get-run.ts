import type { RunDto } from "@anxionos/contracts/orchestration";
import type { RunRepository } from "../../domain/ports/run-repository";
import { toRunDto } from "../dto-mappers";
import { throwOrchestrationError } from "../errors";

export interface GetRunDeps {
	runRepository: RunRepository;
}
export interface GetRunInput {
	organizationId: string;
	runId: string;
}

export async function getRun(
	deps: GetRunDeps,
	input: GetRunInput,
): Promise<RunDto> {
	const run = await deps.runRepository.findById(
		input.organizationId,
		input.runId,
	);
	if (!run) {
		throwOrchestrationError(
			"ORC_RUN_NOT_FOUND",
			`Run ${input.runId} not found`,
		);
	}
	return toRunDto(run);
}
