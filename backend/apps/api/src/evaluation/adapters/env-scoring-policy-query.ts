import type { ScoringPolicyQueryPort } from "@anxionos/evaluation";

function publishedPolicyHashes(): Set<string> {
	const raw = process.env.EVALUATION_PUBLISHED_POLICY_HASHES?.trim();
	if (!raw) return new Set();
	return new Set(
		raw
			.split(",")
			.map((hash) => hash.trim())
			.filter(Boolean),
	);
}

export function createEnvScoringPolicyQueryAdapter(): ScoringPolicyQueryPort {
	const published = publishedPolicyHashes();
	return {
		async isPublishedPolicyHash(input) {
			return published.has(input.policyHash);
		},
	};
}
