import type { GraphErrorCode } from "@anxionos/contracts/graph";
import { GRAPH_ERROR_STATUS_MAP } from "@anxionos/contracts/graph";
export class GraphHttpError extends Error {
	readonly code: GraphErrorCode; readonly details?: unknown; readonly status: number;
	constructor(code: GraphErrorCode, message: string, details?: unknown) {
		super(message); this.name = "GraphHttpError"; this.code = code; this.details = details;
		this.status = GRAPH_ERROR_STATUS_MAP[code as keyof typeof GRAPH_ERROR_STATUS_MAP];
	}
}
export function toGraphErrorBody(error: GraphHttpError, requestId?: string) {
	return { error: { code: error.code, message: error.message, details: error.details, requestId } };
}
