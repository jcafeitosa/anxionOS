export class GraphSchemaRegistryError extends Error {
	code;
	constructor(
		code: GraphSchemaRegistryErrorCode,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "GraphSchemaRegistryError";
		this.code = code;
	}
}

export type GraphSchemaRegistryErrorCode =
	| "UNKNOWN_NODE_TYPE"
	| "UNKNOWN_EDGE_TYPE"
	| "EDGE_NOT_REGISTERED"
	| "SUBPLAN_EDGE_NOT_REGISTERED"
	| "TRAVERSAL_NOT_REGISTERED"
	| "DUPLICATE_SUBPLAN"
	| "DUPLICATE_NODE_TYPE";
