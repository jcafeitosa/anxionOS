import type { CorporateActionRecord } from "../../domain/fx-corporate-actions-models";
import type { CorporateActionRepository } from "../../domain/ports/fx-corporate-actions-repository";

export interface GetAdjustedPriceDeps {
	corporateActions: CorporateActionRepository;
}

export interface GetAdjustedPriceInput {
	instrumentId: string;
	organizationId: string;
	asOf: string;
	priceDate: string;
	rawPrice: string;
}

export type GetAdjustedPriceResult =
	| {
			status: "ADJUSTED";
			rawPrice: string;
			adjustedPrice: string;
			appliedActions: CorporateActionRecord[];
	  }
	| {
			status: "NO_ACTIONS";
			rawPrice: string;
			adjustedPrice: string;
			appliedActions: CorporateActionRecord[];
	  };

/**
 * Point-in-time adjusted price: product of corporate-action factors whose
 * recorded_at <= asOf (repository) and effective_date > priceDate (here).
 */
export async function getAdjustedPrice(
	deps: GetAdjustedPriceDeps,
	input: GetAdjustedPriceInput,
): Promise<GetAdjustedPriceResult> {
	const actions = await deps.corporateActions.findByInstrumentAsOf(
		input.instrumentId,
		input.organizationId,
		input.asOf,
	);
	const applicable = actions.filter(
		(action) => action.effective_date > String(input.priceDate),
	);
	let product = 1;
	for (const action of applicable) {
		if (action.adjustment_factor == null || action.adjustment_factor === "") {
			continue;
		}
		const factorNum = Number(action.adjustment_factor);
		if (!Number.isNaN(factorNum) && factorNum > 0) {
			product *= factorNum;
		}
	}
	const rawPriceNum = Number(input.rawPrice);
	const adjustedPriceNum = Number.isFinite(rawPriceNum)
		? rawPriceNum * product
		: rawPriceNum;
	const adjustedPrice = adjustedPriceNum.toFixed(8);
	if (applicable.length === 0) {
		return {
			status: "NO_ACTIONS",
			rawPrice: input.rawPrice,
			adjustedPrice,
			appliedActions: [],
		};
	}
	return {
		status: "ADJUSTED",
		rawPrice: input.rawPrice,
		adjustedPrice,
		appliedActions: applicable,
	};
}
