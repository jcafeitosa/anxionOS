import {
	listAgencyPortfolioOverview,
	type PortfolioOverviewItem,
	type PortfolioOverviewValuation,
} from "@anxionos/portfolios";
import { z } from "zod";
import type { PortfoliosPluginDeps } from "../plugin";

export const portfolioOverviewValuationSchema = z.object({
	id: z.string().min(1),
	asOf: z.string().datetime(),
	navBase: z.string().min(1),
	status: z.string().min(1),
	qualityFlags: z.array(z.string()),
});

export const portfolioOverviewItemSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	baseCurrency: z.string().min(1),
	executionMode: z.string().min(1),
	status: z.string().min(1),
	positionCount: z.number().int().nonnegative(),
	latestValuation: portfolioOverviewValuationSchema.nullable(),
});

export type PortfolioOverviewItemDto = z.infer<typeof portfolioOverviewItemSchema>;

function toValuationDto(
	valuation: PortfolioOverviewValuation | null,
): z.infer<typeof portfolioOverviewValuationSchema> | null {
	if (!valuation) {
		return null;
	}
	return {
		id: valuation.id,
		asOf: valuation.asOf,
		navBase: valuation.navBase,
		status: valuation.status,
		qualityFlags: valuation.qualityFlags,
	};
}

export function toPortfolioOverviewDto(
	item: PortfolioOverviewItem,
): PortfolioOverviewItemDto {
	return {
		id: item.id,
		name: item.name,
		baseCurrency: item.baseCurrency,
		executionMode: item.executionMode,
		status: item.status,
		positionCount: item.positionCount,
		latestValuation: toValuationDto(item.latestValuation),
	};
}

export async function handleListAgencyPortfolios(
	deps: PortfoliosPluginDeps,
	input: { agencyId: string },
) {
	const result = await listAgencyPortfolioOverview(
		{
			portfolios: deps.portfolios,
			positions: deps.positions,
			valuationSnapshots: deps.valuationSnapshots,
		},
		{ organizationId: input.agencyId },
	);
	return {
		portfolios: result.portfolios.map(toPortfolioOverviewDto),
	};
}
