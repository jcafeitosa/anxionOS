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

/**
 * ANX-476/D (LOW do G2) — igualdade de conjuntos de capability SEM ordem. O
 * `capabilitySubset` e' um conjunto (a ordem nao tem semantica: a delegacao cria
 * um grant por item), entao comparar com `JSON.stringify` dava 409 falso para o
 * mesmo conjunto em ordem diferente e o retry legitimo era recusado. Duplicatas
 * continuam significativas (multiset), porque o comando materializa um grant por
 * item.
 */
export function capabilitySubsetsEqual(
	left: readonly string[],
	right: readonly string[],
): boolean {
	if (left.length !== right.length) {
		return false;
	}
	const sortedLeft = [...left].sort();
	const sortedRight = [...right].sort();
	return sortedLeft.every(
		(capability, index) => capability === sortedRight[index],
	);
}
