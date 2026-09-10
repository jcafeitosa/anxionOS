import { throwKnowledgeError } from "./errors";

const INJECTION_PATTERNS = [
	/ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
	/system\s*:\s*/i,
	/<\s*script\b/i,
	/\{\{\s*system\s*\}\}/i,
	/you\s+are\s+now\s+/i,
];

export function sanitizeRetrievalQuery(queryText: string): string {
	const trimmed = queryText.trim();
	if (trimmed.length === 0) {
		throwKnowledgeError("KN_INJECTION_DETECTED", "empty query rejected");
	}
	for (const pattern of INJECTION_PATTERNS) {
		if (pattern.test(trimmed)) {
			throwKnowledgeError(
				"KN_INJECTION_DETECTED",
				"query contains disallowed instruction pattern",
			);
		}
	}
	return trimmed;
}
