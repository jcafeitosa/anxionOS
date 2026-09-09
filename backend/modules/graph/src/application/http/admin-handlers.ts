import type { GraphHttpRuntime } from "./graph-runtime";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { GRAPH_REBUILD_OWNER_DOMAIN_ORDER } from "../../domain/rebuild/constants";
import { RebuildError } from "../../domain/rebuild/errors";
import { GraphHttpError } from "./graph-http-error";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const adminRebuildInputSchema = z.object({
    auditManifestId: z.string().uuid(),
});
export const adminDlqReplayInputSchema = z.object({
    auditManifestId: z.string().uuid(),
});
export function assertPlatformScope(scopeType: string): void {
    if (scopeType !== "PLATFORM") {
        throw new GraphHttpError("FORBIDDEN_SCOPE", "Admin graph operations require PLATFORM acting scope");
    }
}
export async function handleAdminRebuild(runtime, body, actingScopeType) {
    assertPlatformScope(actingScopeType);
    const parsed = adminRebuildInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "auditManifestId is required", parsed.error.flatten());
    }
    try {
        const currentGeneration = await runtime.rebuildControl.getCurrentGeneration();
        const registryGeneration = await runtime.getRegistryGeneration();
        const job = await runtime.rebuildControl.createRebuildJob({
            targetGeneration: currentGeneration + 1,
            cutoffCheckpoint: 0,
            ownerDomainOrder: [...GRAPH_REBUILD_OWNER_DOMAIN_ORDER],
            registryGeneration,
            auditManifestId: parsed.data.auditManifestId,
        });
        return { jobId: job.jobId, status: job.status };
    }
    catch (error) {
        if (error instanceof RebuildError) {
            throw new GraphHttpError("GRAPH_UNAVAILABLE", error.message, {
                code: error.code,
            });
        }
        throw error;
    }
}
export async function handleAdminDlqReplay(runtime, dlqId, body, actingScopeType) {
    assertPlatformScope(actingScopeType);
    if (!UUID_RE.test(dlqId)) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "Invalid dlqId");
    }
    const parsed = adminDlqReplayInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new GraphHttpError("TRAVERSAL_INPUT_INVALID", "auditManifestId is required", parsed.error.flatten());
    }
    const entry = await runtime.dlqReplay.findById(dlqId);
    if (!entry) {
        throw new GraphHttpError("NODE_NOT_FOUND", "DLQ entry not found", { dlqId });
    }
    const replayResult = await runtime.dlqReplay.replay(dlqId, parsed.data.auditManifestId);
    if (replayResult === "replayed") {
        await runtime.dlqReplay.resetInboxForReplay(entry.eventId, entry.consumerName);
    }
    return {
        dlqId,
        replayStatus: replayResult === "replayed" ? "replayed" : entry.replayStatus,
        idempotent: replayResult === "already_replayed",
    };
}
export function newAuditManifestId(): string {
    return randomUUID();
}
