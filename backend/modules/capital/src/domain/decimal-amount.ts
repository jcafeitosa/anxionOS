const SCALE = 8;

function toScaledParts(value: string): bigint {
	const normalized = value.trim();
	if (!/^\d+(\.\d+)?$/.test(normalized)) {
		throw new Error(`Invalid decimal amount: ${value}`);
	}
	const [whole, fraction = ""] = normalized.split(".");
	const scaledFraction = `${fraction}${"0".repeat(SCALE)}`.slice(0, SCALE);
	return BigInt(`${whole}${scaledFraction}`);
}

export function compareDecimalAmounts(left: string, right: string): number {
	const a = toScaledParts(left);
	const b = toScaledParts(right);
	if (a === b) return 0;
	return a > b ? 1 : -1;
}

export function addDecimalAmounts(left: string, right: string): string {
	const result = toScaledParts(left) + toScaledParts(right);
	const raw = result.toString().padStart(SCALE + 1, "0");
	const whole = raw.slice(0, -SCALE) || "0";
	const fraction = raw.slice(-SCALE).replace(/0+$/, "");
	return fraction.length > 0 ? `${whole}.${fraction}` : whole;
}

export function subtractDecimalAmounts(left: string, right: string): string {
	const result = toScaledParts(left) - toScaledParts(right);
	if (result < 0n) {
		throw new Error("CAP_RELEASE_EXCEEDS_RESERVED");
	}
	const sign = result < 0n ? "-" : "";
	const abs = result < 0n ? -result : result;
	const raw = abs.toString().padStart(SCALE + 1, "0");
	const whole = raw.slice(0, -SCALE) || "0";
	const fraction = raw.slice(-SCALE).replace(/0+$/, "");
	return fraction.length > 0 ? `${sign}${whole}.${fraction}` : `${sign}${whole}`;
}
