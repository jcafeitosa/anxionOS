import type { NodeProjectionDto } from "@anxionos/contracts/graph";
import type { GraphNodeRecord } from "../../domain/ports/graph-store";
export function buildNodeEtag(
	checkpoint: string,
	projectionGeneration: number,
): string {
	return `W/"pg:${checkpoint}:neo:${projectionGeneration}"`;
}
export function toNodeProjectionDto(
	record: GraphNodeRecord,
	checkpoint: string,
	options?: { stale?: boolean },
): NodeProjectionDto {
	return {
		nodeKey: record.nodeKey,
		schemaVersion: record.schemaVersion,
		ownerDomain: record.ownerDomain,
		status: record.status,
		revision: record.revision,
		projectionGeneration: record.projectionGeneration,
		checkpoint,
		recordedAt: new Date().toISOString(),
		payload: record.payload,
		stale: options?.stale ?? false,
	};
}
