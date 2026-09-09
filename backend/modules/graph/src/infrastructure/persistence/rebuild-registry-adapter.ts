import {
	bumpRegistryGeneration,
	getCurrentGeneration,
	getRegistryGeneration,
	swapCurrentGeneration,
} from "./rebuild-job-repository";

export function createRebuildRegistryPort(pool) {
	return {
		async getRegistryGeneration() {
			return getRegistryGeneration(pool);
		},
		async bumpRegistryGeneration() {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const generation = await bumpRegistryGeneration(client);
				await client.query("COMMIT");
				return generation;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
		async getCurrentGeneration() {
			return getCurrentGeneration(pool);
		},
		async swapCurrentGeneration(generation) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				await swapCurrentGeneration(client, generation);
				await client.query("COMMIT");
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
	};
}
