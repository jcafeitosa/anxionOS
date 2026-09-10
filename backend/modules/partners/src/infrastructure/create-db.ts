import type { Pool, PoolClient } from "pg";
import {
	createPgCommissionAccrualRepository,
	createPgPartnerRepository,
	createPgPayoutRepository,
} from "./persistence/repositories";

export function createPartnersDb(pool: Pool | PoolClient) {
	return {
		partners: createPgPartnerRepository(pool),
		commissionAccruals: createPgCommissionAccrualRepository(pool),
		payouts: createPgPayoutRepository(pool),
	};
}
