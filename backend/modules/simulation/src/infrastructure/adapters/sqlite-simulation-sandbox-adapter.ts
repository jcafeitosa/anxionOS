import { Database } from "bun:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { SIMULATION_ERROR_CODES } from "@anxionos/contracts/simulation";
import {
	computeFixtureDatasetHash,
	DEFAULT_DATASET_HASH,
} from "../../application/dataset-hash-support";
import type {
	SimulationSandboxInput,
	SimulationSandboxPort,
	SimulationSandboxResult,
} from "../../domain/ports/simulation-sandbox-port";

export interface SqliteSimulationSandboxOptions {
	sandboxRoot: string;
	forceFailure?: boolean;
}

function buildMetricsHash(input: {
	simulationRunId: string;
	organizationId: string;
	seedHash: string | null;
	datasetHash: string;
	tickCount: number;
}): string {
	return createHash("sha256")
		.update(
			[
				input.simulationRunId,
				input.organizationId,
				input.seedHash ?? "no-seed",
				input.datasetHash,
				String(input.tickCount),
			].join(":"),
		)
		.digest("hex");
}

function resolveSandboxPath(
	root: string,
	organizationId: string,
	simulationRunId: string,
): string {
	return join(root, organizationId, simulationRunId);
}

export function createSqliteSimulationSandboxAdapter(
	options: SqliteSimulationSandboxOptions,
): SimulationSandboxPort {
	return {
		async execute(
			input: SimulationSandboxInput,
		): Promise<SimulationSandboxResult> {
			if (options.forceFailure) {
				return {
					status: "FAILED",
					datasetHash: input.expectedDatasetHash,
					metricsHash: null,
					failureCode: "SIM_EXECUTION_FAILED",
					resultPayload: null,
				};
			}

			const fixtureDatasetHash =
				computeFixtureDatasetHash(input.manifestPayload) ??
				DEFAULT_DATASET_HASH;
			if (fixtureDatasetHash !== input.expectedDatasetHash) {
				return {
					status: "FAILED",
					datasetHash: fixtureDatasetHash,
					metricsHash: null,
					failureCode: SIMULATION_ERROR_CODES.DATASET_HASH_MISMATCH,
					resultPayload: null,
				};
			}

			const sandboxDir = resolveSandboxPath(
				options.sandboxRoot,
				input.organizationId,
				input.simulationRunId,
			);
			mkdirSync(sandboxDir, { recursive: true, mode: 0o700 });
			const dbPath = join(sandboxDir, "sandbox.db");
			const db = new Database(dbPath, { create: true });
			try {
				db.exec(`
					CREATE TABLE IF NOT EXISTS simulation_ticks (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						tick_index INTEGER NOT NULL,
						price REAL NOT NULL
					);
					CREATE TABLE IF NOT EXISTS simulation_metrics (
						id INTEGER PRIMARY KEY CHECK (id = 1),
						tick_count INTEGER NOT NULL,
						metrics_hash TEXT NOT NULL
					);
				`);

				const seedMaterial =
					input.seedHash ??
					createHash("sha256")
						.update(`${input.simulationRunId}:${input.organizationId}`)
						.digest("hex");
				const tickCount = 16;
				for (let tickIndex = 0; tickIndex < tickCount; tickIndex += 1) {
					const priceSeed = createHash("sha256")
						.update(`${seedMaterial}:${tickIndex}`)
						.digest("hex");
					const price = Number.parseInt(priceSeed.slice(0, 8), 16) / 1_000_000;
					db.prepare(
						"INSERT INTO simulation_ticks (tick_index, price) VALUES (?, ?)",
					).run(tickIndex, price);
				}

				const metricsHash = buildMetricsHash({
					simulationRunId: input.simulationRunId,
					organizationId: input.organizationId,
					seedHash: input.seedHash,
					datasetHash: fixtureDatasetHash,
					tickCount,
				});
				db.prepare(
					`INSERT INTO simulation_metrics (id, tick_count, metrics_hash)
					 VALUES (1, ?, ?)
					 ON CONFLICT(id) DO UPDATE SET tick_count = excluded.tick_count, metrics_hash = excluded.metrics_hash`,
				).run(tickCount, metricsHash);

				const tickRows = db
					.prepare(
						"SELECT tick_index, price FROM simulation_ticks ORDER BY tick_index",
					)
					.all() as Array<{ tick_index: number; price: number }>;

				return {
					status: "COMPLETED",
					datasetHash: fixtureDatasetHash,
					metricsHash,
					failureCode: null,
					resultPayload: {
						sandboxId: randomUUID(),
						simulationRunId: input.simulationRunId,
						datasetHash: fixtureDatasetHash,
						metricsHash,
						tickCount,
						ticks: tickRows,
					},
				};
			} finally {
				db.close();
			}
		},
	};
}
