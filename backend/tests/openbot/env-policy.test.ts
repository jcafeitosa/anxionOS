import { describe, expect, test } from "bun:test";
import {
	OPENBOT_E2E_SKIP_MESSAGE,
	OPENBOT_INTELLIGENCE_MISSING_MESSAGE,
	assertOpenBotHomologationEnvForCi,
	getOpenBotHomologationSkipReason,
	resolveOpenBotHomologationPolicy,
} from "@anxionos/contracts/openbot";

describe("openbot env policy (ANX-144 S1 / R144-06)", () => {
	test("default/unset SKIP_OPENBOT_E2E is fail-closed (skip homologation)", () => {
		const policy = resolveOpenBotHomologationPolicy({});
		expect(policy.skipE2E).toBe(true);
		expect(policy.canRunHomologation).toBe(false);
		expect(policy.blockReason).toBe(OPENBOT_E2E_SKIP_MESSAGE);
	});

	test("SKIP_OPENBOT_E2E=1 explicitly skips", () => {
		const reason = getOpenBotHomologationSkipReason({ SKIP_OPENBOT_E2E: "1" });
		expect(reason).toBe(OPENBOT_E2E_SKIP_MESSAGE);
	});

	test("SKIP_OPENBOT_E2E=0 without INTELLIGENCE_* blocks homologation", () => {
		const policy = resolveOpenBotHomologationPolicy({ SKIP_OPENBOT_E2E: "0" });
		expect(policy.skipE2E).toBe(false);
		expect(policy.canRunHomologation).toBe(false);
		expect(policy.blockReason).toBe(OPENBOT_INTELLIGENCE_MISSING_MESSAGE);
	});

	test("SKIP_OPENBOT_E2E=0 with INTELLIGENCE_* enables homologation", () => {
		const policy = resolveOpenBotHomologationPolicy({
			SKIP_OPENBOT_E2E: "0",
			INTELLIGENCE_API_URL: "https://intelligence.example.test",
			INTELLIGENCE_API_KEY: "fixture-key-from-secret-store",
		});
		expect(policy.canRunHomologation).toBe(true);
		expect(policy.blockReason).toBeNull();
	});

	test("assertOpenBotHomologationEnvForCi throws when enabled without Intelligence env", () => {
		expect(() =>
			assertOpenBotHomologationEnvForCi({ SKIP_OPENBOT_E2E: "0" }),
		).toThrow(OPENBOT_INTELLIGENCE_MISSING_MESSAGE);
	});
});
