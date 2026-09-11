import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SimulationResultStorePort } from "../../domain/ports/simulation-result-store-port";

export interface FilesystemSimulationResultStoreOptions {
	sandboxRoot: string;
}

function resolveResultPath(
	root: string,
	organizationId: string,
	simulationRunId: string,
): string {
	return join(root, organizationId, simulationRunId, "result.json");
}

export function createFilesystemSimulationResultStoreAdapter(
	options: FilesystemSimulationResultStoreOptions,
): SimulationResultStorePort {
	return {
		async put(input) {
			const resultPath = resolveResultPath(
				options.sandboxRoot,
				input.organizationId,
				input.simulationRunId,
			);
			mkdirSync(join(options.sandboxRoot, input.organizationId, input.simulationRunId), {
				recursive: true,
				mode: 0o700,
			});
			writeFileSync(
				resultPath,
				JSON.stringify(
					{
						metricsHash: input.metricsHash,
						payload: input.payload,
					},
					null,
					2,
				),
				{ encoding: "utf8", mode: 0o600 },
			);
			return {
				resultRef: `sandbox://simulation/${input.simulationRunId}`,
			};
		},
	};
}
