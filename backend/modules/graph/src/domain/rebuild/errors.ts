export class RebuildError extends Error {
	code;
	constructor(message, code) {
		super(message);
		this.name = "RebuildError";
		this.code = code;
	}
}
export function isRebuildError(error: unknown): error is RebuildError {
	return error instanceof RebuildError;
}
