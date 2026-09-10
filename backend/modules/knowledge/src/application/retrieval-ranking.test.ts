import { describe, expect, test } from "bun:test";
import { recallAtK } from "./context-manifest";
import { cosineSimilarity } from "./retrieval-ranking";

describe("retrieval ranking", () => {
	test("cosineSimilarity ranks identical vectors highest", () => {
		const vector = [1, 0, 0];
		expect(cosineSimilarity(vector, vector)).toBe(1);
		expect(cosineSimilarity(vector, [0, 1, 0])).toBe(0);
	});

	test("recallAtK measures hit coverage", () => {
		const hits = [
			{
				chunkId: "kn_chk_a",
				documentId: "kn_doc_a",
				documentVersionId: "kn_dver_a",
				contentHash: "a".repeat(64),
				textPreview: "alpha",
				score: 0.9,
				provenance: {
					sourceTitle: "A",
					classification: "INTERNAL",
					aclId: "11111111-1111-4111-8111-111111111111",
					aclEpoch: 1,
				},
			},
		];
		expect(recallAtK(["kn_doc_a"], hits, 1)).toBe(1);
		expect(recallAtK(["kn_doc_b"], hits, 1)).toBe(0);
	});
});
