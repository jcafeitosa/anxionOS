export class IncidentRevisionConflictError extends Error {
	constructor() {
		super("incident revision conflict");
		this.name = "IncidentRevisionConflictError";
	}
}
