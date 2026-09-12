import type { PoolClient } from "pg";

export interface PrincipalLookupOptions {
	/**
	 * ANX-477 — quando presente, a leitura usa ESTA conexao (a transacao do
	 * chamador) em vez do pool compartilhado. O comando ja' segura uma conexao
	 * enquanto a transacao esta' aberta; pedir uma SEGUNDA do mesmo pool esgota
	 * o pool sob rajada (N ~ `pool.options.max`). Mesmo padrao de
	 * `OrganizationsMembershipReadOptions`.
	 */
	transactionClient?: PoolClient;
}

export interface PrincipalLookup {
	exists(
		principalId: string,
		options?: PrincipalLookupOptions,
	): Promise<boolean>;
}

export class PrincipalLookupUnavailableError extends Error {
	constructor(
		message = "Identity service unavailable",
		options?: ErrorOptions,
	) {
		super(message, options);
		this.name = "PrincipalLookupUnavailableError";
	}
}
