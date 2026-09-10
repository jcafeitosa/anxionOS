import { TASKBOARD_POLL_INTERVAL_MS } from "../../domain/constants";
import type { TaskboardMirrorPort } from "../../domain/ports/taskboard-mirror";
import type { TaskboardMirrorStatus } from "../services/validate-mirror-transition";
import {
	type IngestTaskboardWebhookDeps,
	ingestTaskboardWebhook,
} from "./ingest-taskboard-webhook";

export interface SyncTaskboardStatusDeps extends IngestTaskboardWebhookDeps {
	taskboardMirrorPort: Pick<TaskboardMirrorPort, "listActiveIssues">;
}

export interface SyncTaskboardStatusResult {
	pollIntervalMs: number;
	synced: number;
	duplicates: number;
	skipped: number;
	errors: number;
}

/**
 * Polling fallback reconciles active in_progress issues from the taskboard API.
 * Worker composition in `apps/workers` is deferred until that app exists.
 */
export { TASKBOARD_POLL_INTERVAL_MS };

export async function syncTaskboardStatus(
	deps: SyncTaskboardStatusDeps,
): Promise<SyncTaskboardStatusResult> {
	const result: SyncTaskboardStatusResult = {
		pollIntervalMs: TASKBOARD_POLL_INTERVAL_MS,
		synced: 0,
		duplicates: 0,
		skipped: 0,
		errors: 0,
	};
	const issues = await deps.taskboardMirrorPort.listActiveIssues();
	for (const issue of issues) {
		try {
			const status = issue.status as TaskboardMirrorStatus;
			const occurredAt = new Date().toISOString();
			const command = {
				issueIdentifier: issue.issueIdentifier,
				status,
				boardVersion: issue.boardVersion,
				threadId: issue.threadId ?? undefined,
				occurredAt,
			};
			const rawPayload = JSON.stringify({
				issueIdentifier: command.issueIdentifier,
				status: command.status,
				boardVersion: command.boardVersion,
				threadId: command.threadId,
				occurredAt: command.occurredAt,
			});
			const ingest = await ingestTaskboardWebhook(deps, command, {
				rawPayload,
			});
			if (ingest.dedupe === "inserted") {
				result.synced += 1;
			} else {
				result.duplicates += 1;
			}
		} catch {
			result.errors += 1;
		}
	}
	return result;
}
