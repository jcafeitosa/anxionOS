import {
	type PartnersCommandResult,
	type PartnersErrorCode,
	partnersCommandResultSchema,
} from "@anxionos/contracts/partners";

export class PartnersCommandError extends Error {
	readonly code: PartnersErrorCode;

	constructor(code: PartnersErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "PartnersCommandError";
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
	});
}
