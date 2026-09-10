export class AgentRevisionConflictError extends Error {
	constructor() {
		super("Agent revision conflict");
		this.name = "AgentRevisionConflictError";
	}
}

export class AgentVersionImmutableError extends Error {
	constructor() {
		super("Published agent version is immutable");
		this.name = "AgentVersionImmutableError";
	}
}
