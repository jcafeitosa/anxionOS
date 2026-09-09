import type { GateDisposition, GateId, HierarchyMode } from "@anxionos/contracts/orchestration";

export interface GateBinding {
    id: string;
    organizationId: string;
    gateId: GateId;
    issueIdentifier: string;
    runId: string | null;
    disposition: GateDisposition;
    reviewerId: string;
    artifactDigest: string | null;
    artifactRevision: number | null;
    notApplicableReason: string | null;
    hierarchyModeAtRecord: HierarchyMode;
    schemaVersion: string;
    recordedAt: Date;
    invalidatedAt: Date | null;
}
export interface NewGateBinding {
    organizationId: string;
    gateId: GateId;
    issueIdentifier: string;
    runId?: string | null;
    disposition: GateDisposition;
    reviewerId: string;
    artifactDigest?: string | null;
    artifactRevision?: number | null;
    notApplicableReason?: string | null;
    hierarchyModeAtRecord: HierarchyMode;
    recordedAt: Date;
}

export function isGateBindingVigente(binding: GateBinding, now: Date): boolean {
    if (binding.invalidatedAt && binding.invalidatedAt <= now)
        return false;
    return binding.disposition === "PASS";
}
export function shouldInvalidatePriorPass(existing: GateBinding, nextDigest: string | null): boolean {
    if (existing.disposition !== "PASS" || existing.invalidatedAt)
        return false;
    if (!nextDigest || !existing.artifactDigest)
        return false;
    return existing.artifactDigest !== nextDigest;
}
