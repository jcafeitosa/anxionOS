import { createPartnersDb } from "@anxionos/partners";
import type { Pool } from "pg";
import type { PartnersPluginDeps } from "./plugin";

export type PartnersApiRuntime = Omit<
	PartnersPluginDeps,
	"auth" | "scopedPool" | "identityRepository"
>;

export function createPartnersApiRuntime(pool: Pool): PartnersApiRuntime {
	const partnersDb = createPartnersDb(pool);
	return {
		partners: partnersDb.partners,
		commissionAccruals: partnersDb.commissionAccruals,
		payouts: partnersDb.payouts,
	};
}
