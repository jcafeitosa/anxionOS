import {
	type BillingCommandResult,
	type BillingErrorCode,
	billingCommandResultSchema,
} from "@anxionos/contracts/billing";

export class BillingCommandError extends Error {
	readonly code: BillingErrorCode;

	constructor(code: BillingErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "BillingCommandError";
	}
}

export function throwBillingError(
	code: BillingErrorCode,
	message: string,
): never {
	throw new BillingCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): BillingCommandResult {
	return billingCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		subscriptionId: snapshot.subscriptionId,
		invoiceId: snapshot.invoiceId,
		lineId: snapshot.lineId,
		usageAggregationId: snapshot.usageAggregationId,
	});
}
