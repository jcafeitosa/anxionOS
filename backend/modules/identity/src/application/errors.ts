import { AppError } from "@anxionos/contracts/errors";
import {
	IDENTITY_ERROR_STATUS_MAP,
	type IdentityCommandResult,
	type IdentityErrorCode,
	identityCommandResultSchema,
} from "@anxionos/contracts/identity";

/**
 * `IDN_IDEMPOTENT_REPLAY` is a successful replay outcome, not a failure: the
 * application returns the stored result instead of throwing. It is therefore
 * excluded from the throwable set so a replay can never be raised as an error.
 */
export type ThrowableIdentityErrorCode = Exclude<
	IdentityErrorCode,
	"IDN_IDEMPOTENT_REPLAY"
>;

function appCodeForStatus(
	statusCode: number,
):
	| "NOT_FOUND"
	| "FORBIDDEN"
	| "UNAUTHORIZED"
	| "CONFLICT"
	| "SERVICE_UNAVAILABLE"
	| "INTERNAL_ERROR" {
	if (statusCode === 404) return "NOT_FOUND";
	if (statusCode === 403) return "FORBIDDEN";
	if (statusCode === 401) return "UNAUTHORIZED";
	if (statusCode === 409) return "CONFLICT";
	if (statusCode === 503) return "SERVICE_UNAVAILABLE";
	return "INTERNAL_ERROR";
}

export class IdentityCommandError extends AppError {
	identityCode: ThrowableIdentityErrorCode;

	constructor(
		identityCode: ThrowableIdentityErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		const statusCode = IDENTITY_ERROR_STATUS_MAP[identityCode];
		super({
			code: appCodeForStatus(statusCode),
			message,
			details: { code: identityCode },
			expose: true,
			cause: options?.cause,
		});
		this.name = "IdentityCommandError";
		this.identityCode = identityCode;
		Object.defineProperty(this, "statusCode", { value: statusCode });
	}
}

export function throwIdentityError(
	code: ThrowableIdentityErrorCode,
	message: string,
	options?: { cause?: unknown },
): never {
	throw new IdentityCommandError(code, message, options);
}

/** Rehydrates the snapshot stored by `identity_command_journal.response_snapshot`. */
export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown> | null,
): IdentityCommandResult {
	return identityCommandResultSchema.parse(snapshot);
}

/**
 * PostgreSQL unique violation (`23505`) — used to classify index races.
 *
 * O driver nao expoe o codigo no topo: drizzle-orm 0.45 envolve o erro do `pg`
 * em `DrizzleQueryError` com `cause = DatabaseError { code: "23505" }`. Ler so
 * `error.code` nao detectava NADA em producao (os mapeamentos 23505 ficavam
 * mortos), por isso a cadeia de `cause` e percorrida.
 */
export function isUniqueViolation(error: unknown): boolean {
	let current: unknown = error;
	for (let depth = 0; depth < 5; depth += 1) {
		if (typeof current !== "object" || current === null) {
			return false;
		}
		if ((current as { code?: unknown }).code === "23505") {
			return true;
		}
		current = (current as { cause?: unknown }).cause;
	}
	return false;
}
