import type {
	PrincipalLookup as ContractPrincipalLookup,
	PrincipalLookupOptions as ContractPrincipalLookupOptions,
} from "@anxionos/contracts/identity";
import type { PoolClient } from "pg";

/** ANX-494 — shared lookup contract specialized at the PostgreSQL adapter boundary. */
export type PrincipalLookupOptions = ContractPrincipalLookupOptions<PoolClient>;
export type PrincipalLookup = ContractPrincipalLookup<PoolClient>;
export { PrincipalLookupUnavailableError } from "@anxionos/contracts/identity";
