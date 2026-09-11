import { z } from "zod";

export const AGENCY_PORTFOLIOS_COLLECTION_PATH =
	"/v1/agencies/:agencyId/portfolios";

/** Public portfolios query — positions count + latest valuation from ANX-153. */
export const FINANCE_COLLECTION_CONTRACT =
	"GET /v1/agencies/:agencyId/portfolios (collection). createPortfoliosPlugin handleListAgencyPortfolios → listAgencyPortfolioOverview; DTO em handlers/overview. ANX-153 G7 + ANX-164 slice 6.";

const valuationOverviewSchema = z.object({
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
	latestValuation: valuationOverviewSchema.nullable(),
});

export type PortfolioOverviewItem = z.infer<typeof portfolioOverviewItemSchema>;

const collectionBodySchema = z.union([
	z.array(portfolioOverviewItemSchema),
	z.object({ portfolios: z.array(portfolioOverviewItemSchema) }),
	z.object({ items: z.array(portfolioOverviewItemSchema) }),
]);

export type AgencyFinanceView =
	| { kind: "loading" }
	| { kind: "ready"; items: readonly PortfolioOverviewItem[] }
	| { kind: "empty"; reason: "no_portfolios" | "collection_unavailable"; status: number }
	| { kind: "denied"; status: number }
	| { kind: "stale"; status: number | null };

export type AgencyFinanceFetchFn = typeof fetch;

export function agencyPortfoliosCollectionUrl(agencyId: string): string {
	return `/v1/agencies/${encodeURIComponent(agencyId)}/portfolios`;
}

function itemsFromBody(body: unknown): PortfolioOverviewItem[] | null {
	const parsed = collectionBodySchema.safeParse(body);
	if (!parsed.success) {
		return null;
	}
	if (Array.isArray(parsed.data)) {
		return parsed.data;
	}
	if ("portfolios" in parsed.data) {
		return parsed.data.portfolios;
	}
	return parsed.data.items;
}

/**
 * Maps a live GET of the agency portfolios collection. 404/405 mean the public
 * list surface is absent — honest empty, not a mock NAV table.
 */
export function financeViewFromResponse(
	status: number,
	body: unknown,
): Exclude<AgencyFinanceView, { kind: "loading" }> {
	if (status === 401 || status === 403) {
		return { kind: "denied", status };
	}
	if (status === 404 || status === 405 || status === 422) {
		return { kind: "empty", reason: "collection_unavailable", status };
	}
	if (status < 200 || status >= 300) {
		return { kind: "stale", status };
	}
	const items = itemsFromBody(body);
	if (items === null) {
		return { kind: "stale", status };
	}
	if (items.length === 0) {
		return { kind: "empty", reason: "no_portfolios", status };
	}
	return { kind: "ready", items };
}

export async function fetchAgencyFinanceOverview(
	agencyId: string,
	fetchFn: AgencyFinanceFetchFn = fetch,
): Promise<Exclude<AgencyFinanceView, { kind: "loading" }>> {
	let response: Response;
	try {
		response = await fetchFn(agencyPortfoliosCollectionUrl(agencyId), {
			credentials: "include",
			headers: { Accept: "application/json" },
		});
	} catch {
		return { kind: "stale", status: null };
	}

	let body: unknown = null;
	const contentType = response.headers.get("content-type") ?? "";
	if (contentType.includes("application/json")) {
		try {
			body = await response.json();
		} catch {
			return { kind: "stale", status: response.status };
		}
	}

	return financeViewFromResponse(response.status, body);
}

export function financeEmptyDescription(
	reason: "no_portfolios" | "collection_unavailable",
): string {
	if (reason === "no_portfolios") {
		return `Nenhum portfólio nesta agência. Contrato: ${FINANCE_COLLECTION_CONTRACT}`;
	}
	return `Listagem pública ainda não existe. ${FINANCE_COLLECTION_CONTRACT}`;
}

export function portfolioDisplayLabel(item: PortfolioOverviewItem): string {
	const nav =
		item.latestValuation?.navBase != null
			? `${item.latestValuation.navBase} ${item.baseCurrency}`
			: "valuation ausente";
	return `${item.name} · ${item.positionCount} posição(ões) · NAV ${nav}`;
}

export function valuationDisplayLabel(
	valuation: NonNullable<PortfolioOverviewItem["latestValuation"]>,
	baseCurrency: string,
): string {
	const flags =
		valuation.qualityFlags.length > 0
			? ` · flags ${valuation.qualityFlags.join(", ")}`
			: "";
	return `${valuation.status} · ${valuation.navBase} ${baseCurrency} · asOf ${valuation.asOf}${flags}`;
}
