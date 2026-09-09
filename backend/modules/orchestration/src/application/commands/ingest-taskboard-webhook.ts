import { type IngestTaskboardWebhookCommand } from "@anxionos/contracts/orchestration";
import type { OrchestrationUnitOfWork } from "../../domain/ports/orchestration-unit-of-work";
import { type TaskboardHmacConfig } from "../../domain/policies/taskboard-hmac";
import { ingestTaskboardWebhookCommandSchema } from "@anxionos/contracts/orchestration";
import { verifyTaskboardHmac, } from "../../domain/policies/taskboard-hmac";
import { throwOrchestrationError } from "../errors";
import { validateMirrorTransition } from "../services/validate-mirror-transition";

export interface IngestTaskboardWebhookDeps {
    unitOfWork: OrchestrationUnitOfWork;
    hmacConfig: TaskboardHmacConfig;
}
export interface IngestTaskboardWebhookResult {
    dedupe: "inserted" | "duplicate";
    issueIdentifier: string;
    status: IngestTaskboardWebhookCommand["status"];
    boardVersion: number;
}

}): Promise<IngestTaskboardWebhookResult>;

export async function ingestTaskboardWebhook(deps, input, options) {
    const command = ingestTaskboardWebhookCommandSchema.parse(input);
    const rawPayload = options?.rawPayload ??
        JSON.stringify({
            issueIdentifier: command.issueIdentifier,
            status: command.status,
            boardVersion: command.boardVersion,
            threadId: command.threadId,
            occurredAt: command.occurredAt,
        });
    if (!verifyTaskboardHmac(rawPayload, command.signature, deps.hmacConfig)) {
        throwOrchestrationError("ORC_WEBHOOK_UNAUTHORIZED", "Invalid or missing taskboard webhook signature");
    }
    return deps.unitOfWork.runInTransaction(async (context) => {
        await validateMirrorTransition({
            gateBindingRepository: context.gateBindingRepository,
            taskboardMirrorRepository: context.taskboardMirrorRepository,
        }, {
            issueIdentifier: command.issueIdentifier,
            status: command.status,
            boardVersion: command.boardVersion,
        });
        const dedupe = await context.taskboardMirrorRepository.recordIfAbsent({
            issueIdentifier: command.issueIdentifier,
            boardVersion: command.boardVersion,
            status: command.status,
            threadId: command.threadId ?? null,
            occurredAt: new Date(command.occurredAt),
        });
        return {
            dedupe,
            issueIdentifier: command.issueIdentifier,
            status: command.status,
            boardVersion: command.boardVersion,
        };
    });
}
