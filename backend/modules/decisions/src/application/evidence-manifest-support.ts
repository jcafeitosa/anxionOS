import { createHash } from "node:crypto";

export interface EvidenceManifestHashEntry {
	evidenceId: string;
	claimTextHash: string;
}

export function computeEvidenceManifestHash(
	entries: EvidenceManifestHashEntry[],
): string {
	const sorted = [...entries].sort((left, right) =>
		left.evidenceId.localeCompare(right.evidenceId),
	);
	return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}
