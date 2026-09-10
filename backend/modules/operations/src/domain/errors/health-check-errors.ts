export class HealthCheckRevisionConflictError extends Error {
	constructor() {
		super("health check revision conflict");
		this.name = "HealthCheckRevisionConflictError";
	}
}
