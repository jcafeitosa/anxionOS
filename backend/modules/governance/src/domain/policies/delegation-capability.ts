export function isCapabilityWithinParent(
	parentCapability: string,
	childCapability: string,
): boolean {
	if (parentCapability === childCapability) {
		return true;
	}
	if (parentCapability.endsWith(".*")) {
		const prefix = parentCapability.slice(0, -2);
		if (childCapability === prefix) {
			return true;
		}
		return childCapability.startsWith(`${prefix}.`);
	}
	return false;
}

export function validateCapabilitySubset(
	parentCapability: string,
	capabilitySubset: string[],
): boolean {
	return capabilitySubset.every((capability) =>
		isCapabilityWithinParent(parentCapability, capability),
	);
}
