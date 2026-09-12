import type { PoolClient } from "pg";

export class PrincipalLookupUnavailableError extends Error {
	constructor(message?: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "PrincipalLookupUnavailableError";
	}
}

export interface PrincipalLookupOptions {
	/**
	 * ANX-477 — quando presente, a leitura usa ESTA conexao (a transacao do
	 * chamador) em vez do pool compartilhado, para nao pedir uma segunda
	 * conexao com a transacao ja' aberta. Mesmo padrao de
	 * `OrganizationsMembershipReadOptions`.
	 */
	transactionClient?: PoolClient;
}

export interface PrincipalLookup {
	/** True when an active Principal exists; false for missing or suspended. */
	exists(
		principalId: string,
		options?: PrincipalLookupOptions,
	): Promise<boolean>;
}
