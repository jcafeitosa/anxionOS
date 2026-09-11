import type {
	PortfolioRepository,
	PositionRepository,
	ValuationSnapshotRepository,
} from "../../domain/ports/portfolios-unit-of-work";

export interface PortfolioOverviewValuation {
	id: string;
	asOf: string;
	navBase: string;
	status: string;
	qualityFlags: string[];
}

export interface PortfolioOverviewItem {
	id: string;
	name: string;
	baseCurrency: string;
	executionMode: string;
	status: string;
	positionCount: number;
	latestValuation: PortfolioOverviewValuation | null;
}

export interface ListAgencyPortfolioOverviewDeps {
	portfolios: PortfolioRepository;
	positions: PositionRepository;
	valuationSnapshots: ValuationSnapshotRepository;
}

function qualityFlagsFromJson(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.filter((item): item is string => typeof item === "string");
}

function toValuationOverview(
	snapshot: Awaited<
		ReturnType<ValuationSnapshotRepository["findLatestByPortfolioId"]>
	>,
): PortfolioOverviewValuation | null {
	if (!snapshot) {
		return null;
	}
	return {
		id: snapshot.id,
		asOf: snapshot.asOf,
		navBase: snapshot.navBase,
		status: snapshot.status,
		qualityFlags: qualityFlagsFromJson(snapshot.qualityFlagsJson),
	};
}

export async function listAgencyPortfolioOverview(
	deps: ListAgencyPortfolioOverviewDeps,
	input: { organizationId: string },
): Promise<{ portfolios: PortfolioOverviewItem[] }> {
	const records = await deps.portfolios.findByOrganizationId(
		input.organizationId,
	);
	const portfolios = await Promise.all(
		records.map(async (portfolio) => {
			const [positions, latestValuation] = await Promise.all([
				deps.positions.findByPortfolioId(portfolio.id),
				deps.valuationSnapshots.findLatestByPortfolioId(portfolio.id),
			]);
			return {
				id: portfolio.id,
				name: portfolio.name,
				baseCurrency: portfolio.baseCurrency,
				executionMode: portfolio.executionMode,
				status: portfolio.status,
				positionCount: positions.length,
				latestValuation: toValuationOverview(latestValuation),
			};
		}),
	);
	return { portfolios };
}
