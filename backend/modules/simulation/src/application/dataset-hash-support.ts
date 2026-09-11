import { createHash } from "node:crypto";

export const DEFAULT_DATASET_HASH = "sha256:unset-dataset-hash-v1";

export function computeFixtureDatasetHash(
	manifestPayload: Record<string, unknown> | null,
): string | null {
	if (!manifestPayload) {
		return null;
	}
	const datasetId = manifestPayload.datasetId;
	const datasetRevision = manifestPayload.datasetRevision;
	if (typeof datasetId !== "string" || datasetId.length === 0) {
		return null;
	}
	if (typeof datasetRevision !== "string" || datasetRevision.length === 0) {
		return null;
	}
	const digest = createHash("sha256")
		.update(`${datasetId}:${datasetRevision}`)
		.digest("hex");
	return `sha256:${digest}`;
}

export function resolveDatasetHash(manifest?: Record<string, unknown>): string {
	if (!manifest) {
		return DEFAULT_DATASET_HASH;
	}
	const explicit = manifest.datasetHash;
	if (typeof explicit === "string" && explicit.length > 0) {
		return explicit;
	}
	return computeFixtureDatasetHash(manifest) ?? DEFAULT_DATASET_HASH;
}
