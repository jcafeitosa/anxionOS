import { describe, expect, test } from "bun:test";
import {
	canTransitionRecoveryTaskStatus,
	isAllowedRecoveryStepKind,
	isTerminalRecoveryTaskStatus,
	requiresApprovalForRecoveryStep,
	resolveInitialRecoveryTaskStatus,
} from "@anxionos/operations";

const dangerousStepOptions = { stepRequiresApproval: true };
const safeStepOptions = { stepRequiresApproval: false };

describe("recovery lifecycle domain (ANX-158 S4)", () => {
	test("dangerous steps require approval before execution", () => {
		expect(requiresApprovalForRecoveryStep("RESTORE_DATABASE")).toBe(true);
		expect(requiresApprovalForRecoveryStep("REPLAY_OUTBOX")).toBe(true);
		expect(requiresApprovalForRecoveryStep("VALIDATE_SCHEMA")).toBe(false);
		expect(requiresApprovalForRecoveryStep("CHECK_CHECKPOINT")).toBe(false);
	});

	test("resolveInitialRecoveryTaskStatus gates dangerous steps", () => {
		expect(resolveInitialRecoveryTaskStatus("RESTORE_DATABASE")).toBe(
			"AWAITING_APPROVAL",
		);
		expect(resolveInitialRecoveryTaskStatus("VALIDATE_SCHEMA")).toBe("PENDING");
	});

	test("canTransitionRecoveryTaskStatus enforces approval for dangerous path", () => {
		expect(
			canTransitionRecoveryTaskStatus("AWAITING_APPROVAL", "APPROVED", {
				...dangerousStepOptions,
				hasRequiredApproval: false,
			}),
		).toBe(false);
		expect(
			canTransitionRecoveryTaskStatus("AWAITING_APPROVAL", "APPROVED", {
				...dangerousStepOptions,
				hasRequiredApproval: true,
			}),
		).toBe(true);
	});

	test("blocks PENDING to APPROVED without approval for dangerous step", () => {
		expect(
			canTransitionRecoveryTaskStatus("PENDING", "APPROVED", {
				...dangerousStepOptions,
				hasRequiredApproval: false,
			}),
		).toBe(false);
		expect(
			canTransitionRecoveryTaskStatus(
				"PENDING",
				"APPROVED",
				dangerousStepOptions,
			),
		).toBe(false);
		expect(
			canTransitionRecoveryTaskStatus("PENDING", "APPROVED", {
				...dangerousStepOptions,
				hasRequiredApproval: true,
			}),
		).toBe(true);
	});

	test("blocks PENDING to IN_PROGRESS without approval for dangerous step", () => {
		expect(
			canTransitionRecoveryTaskStatus("PENDING", "IN_PROGRESS", {
				...dangerousStepOptions,
				hasRequiredApproval: false,
			}),
		).toBe(false);
		expect(
			canTransitionRecoveryTaskStatus(
				"PENDING",
				"IN_PROGRESS",
				dangerousStepOptions,
			),
		).toBe(false);
		expect(
			canTransitionRecoveryTaskStatus("PENDING", "IN_PROGRESS", {
				...dangerousStepOptions,
				hasRequiredApproval: true,
			}),
		).toBe(true);
	});

	test("blocks APPROVED to IN_PROGRESS without approval for dangerous step", () => {
		expect(
			canTransitionRecoveryTaskStatus("APPROVED", "IN_PROGRESS", {
				...dangerousStepOptions,
				hasRequiredApproval: false,
			}),
		).toBe(false);
		expect(
			canTransitionRecoveryTaskStatus("APPROVED", "IN_PROGRESS", {
				...dangerousStepOptions,
				hasRequiredApproval: true,
			}),
		).toBe(true);
	});

	test("dangerous step can enter AWAITING_APPROVAL from PENDING without approval flag", () => {
		expect(
			canTransitionRecoveryTaskStatus(
				"PENDING",
				"AWAITING_APPROVAL",
				dangerousStepOptions,
			),
		).toBe(true);
	});

	test("safe steps can move PENDING to IN_PROGRESS without approval flag", () => {
		expect(
			canTransitionRecoveryTaskStatus("PENDING", "IN_PROGRESS", {
				...safeStepOptions,
				hasRequiredApproval: true,
			}),
		).toBe(true);
		expect(
			canTransitionRecoveryTaskStatus(
				"PENDING",
				"IN_PROGRESS",
				safeStepOptions,
			),
		).toBe(true);
		expect(canTransitionRecoveryTaskStatus("PENDING", "IN_PROGRESS")).toBe(
			true,
		);
	});

	test("terminal statuses block further transitions", () => {
		expect(isTerminalRecoveryTaskStatus("COMPLETED")).toBe(true);
		expect(isTerminalRecoveryTaskStatus("FAILED")).toBe(true);
		expect(isTerminalRecoveryTaskStatus("CANCELLED")).toBe(true);
		expect(isTerminalRecoveryTaskStatus("IN_PROGRESS")).toBe(false);
		expect(canTransitionRecoveryTaskStatus("COMPLETED", "IN_PROGRESS")).toBe(
			false,
		);
	});

	test("rejects LLM/inference and unknown step kinds (allowlist)", () => {
		expect(isAllowedRecoveryStepKind("LLM_INVOKE")).toBe(false);
		expect(isAllowedRecoveryStepKind("INFERENCE_CALL")).toBe(false);
		expect(isAllowedRecoveryStepKind("custom_llm_step")).toBe(false);
		expect(isAllowedRecoveryStepKind("UNKNOWN_STEP")).toBe(false);
		expect(isAllowedRecoveryStepKind("")).toBe(false);
		expect(isAllowedRecoveryStepKind("VALIDATE_SCHEMA")).toBe(true);
		expect(isAllowedRecoveryStepKind("RESTORE_DATABASE")).toBe(true);
		expect(isAllowedRecoveryStepKind("PURGE_QUEUE")).toBe(true);
	});

	test("adversarial: dangerous step cannot bypass approval via any execution transition", () => {
		const cases = [
			["PENDING", "APPROVED"],
			["PENDING", "IN_PROGRESS"],
			["AWAITING_APPROVAL", "APPROVED"],
			["APPROVED", "IN_PROGRESS"],
		] as const;

		for (const [from, to] of cases) {
			expect(
				canTransitionRecoveryTaskStatus(from, to, {
					stepRequiresApproval: true,
					hasRequiredApproval: false,
				}),
			).toBe(false);
			expect(
				canTransitionRecoveryTaskStatus(from, to, {
					stepRequiresApproval: true,
					hasRequiredApproval: true,
				}),
			).toBe(true);
		}
	});
});
