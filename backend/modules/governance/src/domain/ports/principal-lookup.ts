import type {
	PrincipalLookup as ContractPrincipalLookup,
	PrincipalLookupOptions as ContractPrincipalLookupOptions,
} from "@anxionos/contracts/identity";
import type { PoolClient } from "pg";

/**
 * ANX-494 — the shared contract is specialized by the adapter boundary with
 * the transaction client type used by PostgreSQL infrastructure.
 */
export type PrincipalLookupOptions = ContractPrincipalLookupOptions<PoolClient>;
export type PrincipalLookup = ContractPrincipalLookup<PoolClient>;
export { PrincipalLookupUnavailableError } from "@anxionos/contracts/identity";
