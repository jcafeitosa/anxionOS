export class RecoveryTaskRevisionConflictError extends Error {
	constructor() {
		super("recovery task revision conflict");
		this.name = "RecoveryTaskRevisionConflictError";
	}
}
