import {
	findDlqEntryById,
	markDlqReplayed,
	resetInboxForReplay,
} from "./dlq-replay";

export function createDlqReplayPort(pool) {
	return {
		async findById(dlqId) {
			return findDlqEntryById(pool, dlqId);
		},
		async replay(dlqId, auditManifestId) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				const result = await markDlqReplayed(client, dlqId, auditManifestId);
				await client.query("COMMIT");
				return result;
			} catch (error) {
				await client.query("ROLLBACK");
				throw error;
			} finally {
				client.release();
			}
		},
		async resetInboxForReplay(eventId, consumerName) {
			const client = await pool.connect();
			try {
				await client.query("BEGIN");
				await resetInboxForReplay(client, eventId, consumerName);
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
