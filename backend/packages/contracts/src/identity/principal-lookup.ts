/**
 * Cross-module contract for looking up an active institutional principal.
 *
 * The transaction client is generic so the contract package stays independent
 * from a database driver while adapters can specialize it with PoolClient.
 */
export interface PrincipalLookupOptions<TTransactionClient = unknown> {
	/** Use the caller's transaction connection when the lookup is transactional. */
	transactionClient?: TTransactionClient;
}

export interface PrincipalLookup<TTransactionClient = unknown> {
	exists(
		principalId: string,
		options?: PrincipalLookupOptions<TTransactionClient>,
	): Promise<boolean>;
}

/** Stable runtime error shared by every principal-lookup adapter. */
export class PrincipalLookupUnavailableError extends Error {
	constructor(
		message = "Identity service unavailable",
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "PrincipalLookupUnavailableError";
	}
}
