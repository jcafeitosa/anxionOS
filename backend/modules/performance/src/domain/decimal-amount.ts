const SCALE = 8;

function toScaledParts(value: string): bigint {
	const normalized = value.trim();
	if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
		throw new Error(`Invalid decimal amount: ${value}`);
	}
	const negative = normalized.startsWith("-");
	const unsigned = negative ? normalized.slice(1) : normalized;
	const [whole, fraction = ""] = unsigned.split(".");
	const scaledFraction = `${fraction}${"0".repeat(SCALE)}`.slice(0, SCALE);
	const scaled = BigInt(`${whole}${scaledFraction}`);
	return negative ? -scaled : scaled;
}

function fromScaledParts(value: bigint): string {
	const negative = value < 0n;
	const abs = negative ? -value : value;
	const raw = abs.toString().padStart(SCALE + 1, "0");
	const whole = raw.slice(0, -SCALE) || "0";
	const fraction = raw.slice(-SCALE).replace(/0+$/, "");
	const unsigned = fraction.length > 0 ? `${whole}.${fraction}` : whole;
	return negative ? `-${unsigned}` : unsigned;
}

export function addDecimalAmounts(left: string, right: string): string {
	return fromScaledParts(toScaledParts(left) + toScaledParts(right));
}

export function subtractDecimalAmounts(left: string, right: string): string {
	return fromScaledParts(toScaledParts(left) - toScaledParts(right));
}

export function normalizeDecimalAmount(value: string): string {
	return fromScaledParts(toScaledParts(value));
}
