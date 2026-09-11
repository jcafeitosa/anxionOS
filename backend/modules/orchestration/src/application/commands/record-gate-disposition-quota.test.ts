import { describe, expect, test } from "bun:test";
import { GATE_DISPOSITION_QUOTA_PER_ORG_PER_WINDOW } from "../../domain/constants";
import type { OrchestrationTransactionContext } from "../../domain/ports/orchestration-unit-of-work";
import { recordGateDisposition } from "./record-gate-disposition";

const ORG = "00000000-0000-4000-8000-000000000001";

describe("recordGateDisposition gate quota", () => {
	test("rejects when organization quota exceeded", async () => {
		const deps = {
			unitOfWork: {
				async runInTransaction(work: (ctx: OrchestrationTransactionContext) => unknown) {
					return work({
						gateBindingRepository: {
							async countByOrganizationSince() {
								return GATE_DISPOSITION_QUOTA_PER_ORG_PER_WINDOW;
							},
							async findVigentePass() {
								return null;
							},
							async listByIssue() {
								return [];
							},
							async append() {
								throw new Error("should not append");
							},
						},
						commandJournal: {
							async findByCommandId() {
								return null;
							},
						},
						async publishEvents() {},
					} as never);
				},
			},
			commandJournal: {
				async findByCommandId() {
					return null;
				},
			},
			organizationScope: {
				async assertActive() {},
				async getHierarchyMode() {
					return "HIERARCHY_TREE";
				},
			},
			principalLookup: {} as never,
		};
		await expect(
			recordGateDisposition(deps as never, {
				organizationId: ORG,
				gateId: "G2",
				issueIdentifier: "ANX-308",
				disposition: "PASS",
				reviewerId: "reviewer-1",
				artifactDigest: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			}),
		).rejects.toMatchObject({ orchestrationCode: "ORC_GATE_QUOTA_EXCEEDED" });
	});
});
