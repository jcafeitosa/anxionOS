export function calculateCommissionAmount(
	invoiceTotalAmount: string,
	commissionRatePercent: string,
): string {
	const total = Number.parseFloat(invoiceTotalAmount);
	const rate = Number.parseFloat(commissionRatePercent) / 100;
	if (
		!Number.isFinite(total) ||
		!Number.isFinite(rate) ||
		total < 0 ||
		rate < 0
	) {
		throw new RangeError("invalid commission inputs");
	}
	const amount = total * rate;
	return amount.toFixed(8).replace(/\.?0+$/, "") || "0";
}

export function sumDecimalAmounts(amounts: string[]): string {
	const sum = amounts.reduce((acc, value) => acc + Number.parseFloat(value), 0);
	return sum.toFixed(8).replace(/\.?0+$/, "") || "0";
}
