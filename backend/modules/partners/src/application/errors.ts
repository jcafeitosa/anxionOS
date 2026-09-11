import { AppError } from "@anxionos/contracts/errors";
import {
	type PartnersCommandResult,
	type PartnersErrorCode,
	partnersCommandResultSchema,
	resolvePartnersErrorStatus,
} from "@anxionos/contracts/partners";

export class PartnersCommandError extends AppError {
	partnersCode: PartnersErrorCode;

	constructor(
		partnersCode: PartnersErrorCode,
		message: string,
		options?: { cause?: unknown },
	) {
		const statusCode = resolvePartnersErrorStatus(partnersCode);
		const appCode =
			statusCode === 404
				? "NOT_FOUND"
				: statusCode === 403
					? "FORBIDDEN"
					: statusCode === 409
						? "CONFLICT"
						: "INTERNAL_ERROR";
		super({
			code: appCode,
			message,
			details: { code: partnersCode },
			expose: true,
			cause: options?.cause,
		});
		this.name = "PartnersCommandError";
		this.partnersCode = partnersCode;
		Object.defineProperty(this, "statusCode", { value: statusCode });
	}
}

export function throwPartnersError(
	code: PartnersErrorCode,
	message: string,
): never {
	throw new PartnersCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): PartnersCommandResult {
	return partnersCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		partnerId: snapshot.partnerId,
		referralId: snapshot.referralId,
		commissionAccrualId: snapshot.commissionAccrualId,
		commissionAmount: snapshot.commissionAmount,
		payoutId: snapshot.payoutId,
	});
}
