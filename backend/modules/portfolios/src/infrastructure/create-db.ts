import type { Pool, PoolClient } from "pg";
import {
	createPgPortfolioRepository,
	createPgPositionRepository,
	createPgValuationSnapshotRepository,
} from "./persistence/repositories";

export function createPortfoliosDb(pool: Pool | PoolClient) {
	return {
		portfolios: createPgPortfolioRepository(pool),
		positions: createPgPositionRepository(pool),
		valuationSnapshots: createPgValuationSnapshotRepository(pool),
	};
}
