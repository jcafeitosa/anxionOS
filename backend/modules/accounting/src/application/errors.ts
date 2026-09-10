import {
	type AccountingCommandResult,
	type AccountingErrorCode,
	accountingCommandResultSchema,
} from "@anxionos/contracts/accounting";

export class AccountingCommandError extends Error {
	readonly code: AccountingErrorCode;

	constructor(code: AccountingErrorCode, message: string) {
		super(message);
		this.code = code;
		this.name = "AccountingCommandError";
	}
}

export function throwAccountingError(
	code: AccountingErrorCode,
	message: string,
): never {
	throw new AccountingCommandError(code, message);
}

export function parseCommandResultSnapshot(
	snapshot: Record<string, unknown>,
): AccountingCommandResult {
	return accountingCommandResultSchema.parse({
		aggregateId: snapshot.aggregateId,
		revision: snapshot.revision,
		idempotentReplay: snapshot.idempotentReplay,
		entryId: snapshot.entryId,
	});
}
