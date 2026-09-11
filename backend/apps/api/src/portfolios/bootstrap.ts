import { createPortfoliosDb } from "@anxionos/portfolios";
import type { Pool } from "pg";

export interface PortfoliosApiRuntime {
	portfolios: ReturnType<typeof createPortfoliosDb>["portfolios"];
	positions: ReturnType<typeof createPortfoliosDb>["positions"];
	valuationSnapshots: ReturnType<typeof createPortfoliosDb>["valuationSnapshots"];
}

export function createPortfoliosApiRuntime(pool: Pool): PortfoliosApiRuntime {
	const db = createPortfoliosDb(pool);
	return {
		portfolios: db.portfolios,
		positions: db.positions,
		valuationSnapshots: db.valuationSnapshots,
	};
}
