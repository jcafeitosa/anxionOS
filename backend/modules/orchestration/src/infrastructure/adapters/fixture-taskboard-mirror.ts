import type {
	TaskboardIssueSnapshot,
	TaskboardMirrorPort,
} from "../../domain/ports/taskboard-mirror";

export interface FixtureTaskboardMirrorConfig {
	activeIssues: TaskboardIssueSnapshot[];
}

export function createFixtureTaskboardMirror(
	config: FixtureTaskboardMirrorConfig,
): TaskboardMirrorPort {
	return {
		async getIssueStatus(issueIdentifier) {
			return (
				config.activeIssues.find(
					(issue) => issue.issueIdentifier === issueIdentifier,
				) ?? null
			);
		},
		async ingestWebhook() {
			throw new Error(
				"Use ingestTaskboardWebhook command for webhook ingestion",
			);
		},
		async listActiveIssues() {
			return config.activeIssues.filter(
				(issue) => issue.status === "in_progress",
			);
		},
	};
}
