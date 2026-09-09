import type { IngestTaskboardWebhookCommand } from "@anxionos/contracts/orchestration";
import type { GateBindingRepository } from "../../domain/ports/gate-binding-repository";
import type { TaskboardMirrorRepository } from "../../domain/ports/taskboard-mirror-repository";
import { throwOrchestrationError } from "../errors";

export type TaskboardMirrorStatus = IngestTaskboardWebhookCommand["status"];

export interface ValidateMirrorTransitionDeps {
    gateBindingRepository: Pick<GateBindingRepository, "findVigentePassByIssue">;
    taskboardMirrorRepository: Pick<TaskboardMirrorRepository, "findLatestByIssue">;
}
export interface ValidateMirrorTransitionInput {
    issueIdentifier: string;
    status: TaskboardMirrorStatus;
    boardVersion: number;
}

const MIRROR_STATUS_TRANSITIONS = {
    todo: ["in_progress", "blocked"],
    in_progress: ["in_review", "blocked", "todo"],
    in_review: ["done", "in_progress", "blocked"],
    blocked: ["todo", "in_progress"],
    done: [],
};
export function requiresG7ForMirrorStatus(status: TaskboardMirrorStatus): boolean {
    return status === "done";
}
export function canTransitionMirrorStatus(from: TaskboardMirrorStatus, to: TaskboardMirrorStatus): boolean {
    if (from === to) {
        return true;
    }
    return MIRROR_STATUS_TRANSITIONS[from].includes(to);
}
export async function validateMirrorTransition(deps, input) {
    const latest = await deps.taskboardMirrorRepository.findLatestByIssue(input.issueIdentifier);
    if (latest && input.boardVersion < latest.boardVersion) {
        throwOrchestrationError("ORC_MIRROR_REJECTED", `Stale board version ${input.boardVersion} < ${latest.boardVersion}`);
    }
    if (latest &&
        latest.status !== input.status &&
        input.boardVersion >= latest.boardVersion) {
        const from = latest.status;
        if (!canTransitionMirrorStatus(from, input.status)) {
            throwOrchestrationError("ORC_MIRROR_REJECTED", `Invalid mirror transition ${from} -> ${input.status}`);
        }
    }
    if (requiresG7ForMirrorStatus(input.status)) {
        const g7Pass = await deps.gateBindingRepository.findVigentePassByIssue(input.issueIdentifier, "G7");
        if (!g7Pass) {
            throwOrchestrationError("ORC_MIRROR_REJECTED", "Board done requires G7 PASS binding");
        }
    }
}
