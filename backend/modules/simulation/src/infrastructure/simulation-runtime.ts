import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFilesystemSimulationResultStoreAdapter } from "./adapters/filesystem-simulation-result-store-adapter";
import { createSqliteSimulationSandboxAdapter } from "./adapters/sqlite-simulation-sandbox-adapter";

export function resolveSimulationSandboxRoot(): string {
	const configured = process.env.SIMULATION_SANDBOX_ROOT?.trim();
	if (configured) {
		return configured;
	}
	return join(tmpdir(), "anxionos-simulation-sandbox");
}

export function createDefaultSimulationSandbox() {
	const sandboxRoot = resolveSimulationSandboxRoot();
	return createSqliteSimulationSandboxAdapter({ sandboxRoot });
}

export function createDefaultSimulationResultStore() {
	// Dev default: filesystem under SIMULATION_SANDBOX_ROOT. S3/object-store adapter is follow-up.
	const backend =
		process.env.SIMULATION_RESULT_STORE_BACKEND?.trim() || "filesystem";
	if (backend !== "filesystem") {
		throw new Error(
			`SIMULATION_RESULT_STORE_BACKEND=${backend} is not supported; only "filesystem" is implemented`,
		);
	}
	const sandboxRoot = resolveSimulationSandboxRoot();
	return createFilesystemSimulationResultStoreAdapter({ sandboxRoot });
}
