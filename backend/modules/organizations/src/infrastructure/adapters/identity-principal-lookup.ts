import {
	createIdentityDb,
	createIdentityRepositoryOn,
	getPrincipalById,
} from "@anxionos/identity";
import type { Pool, PoolClient } from "pg";
import type {
	PrincipalLookup,
	PrincipalLookupOptions,
} from "../../domain/ports/principal-lookup";
import { PrincipalLookupUnavailableError } from "../../domain/ports/principal-lookup";

export function createIdentityPrincipalLookup(pool: Pool): PrincipalLookup {
	const poolRepository = createIdentityDb(pool).repository;
	return {
		async exists(principalId: string, options?: PrincipalLookupOptions) {
			try {
				// ANX-477 — leitura de identidade na conexao que a transacao do
				// chamador JA' segura, via fabrica client-aware do dono de identity
				// (`createIdentityRepositoryOn`): nenhuma SEGUNDA conexao e' pedida ao
				// pool compartilhado (o defeito de pool starvation desta issue), sem
				// cast de tipo e sem alcancar tabela de outro modulo por SQL.
				const repository = options?.transactionClient
					? createIdentityRepositoryOn(options.transactionClient)
					: poolRepository;
				const principal = await getPrincipalById(repository, principalId);
				return principal !== null;
			} catch (error) {
				throw new PrincipalLookupUnavailableError(
					"Identity service unavailable",
					{
						cause: error,
					},
				);
			}
		},
	};
}
