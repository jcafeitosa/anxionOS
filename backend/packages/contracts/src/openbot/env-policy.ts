export const OPENBOT_E2E_SKIP_MESSAGE =
	"OpenBot E2E homologation skipped — set SKIP_OPENBOT_E2E=0 to enable";

export const OPENBOT_INTELLIGENCE_MISSING_MESSAGE =
	"OpenBot homologation requires INTELLIGENCE_API_URL and INTELLIGENCE_API_KEY via secret store";

export type OpenBotHomologationPolicy = {
	skipE2E: boolean;
	canRunHomologation: boolean;
	intelligenceConfigured: boolean;
	blockReason: string | null;
};

function readEnv(
	env: Record<string, string | undefined>,
	key: string,
): string | undefined {
	return env[key]?.trim() || undefined;
}

/** Fail-closed: E2E off unless SKIP_OPENBOT_E2E=0; Intelligence keys required to run. */
export function resolveOpenBotHomologationPolicy(
	env: Record<string, string | undefined> = process.env,
): OpenBotHomologationPolicy {
	const skipFlag = readEnv(env, "SKIP_OPENBOT_E2E");
	const skipE2E = skipFlag !== "0";
	const intelligenceConfigured = Boolean(
		readEnv(env, "INTELLIGENCE_API_URL") &&
			readEnv(env, "INTELLIGENCE_API_KEY"),
	);

	let blockReason: string | null = null;
	if (skipE2E) {
		blockReason = OPENBOT_E2E_SKIP_MESSAGE;
	} else if (!intelligenceConfigured) {
		blockReason = OPENBOT_INTELLIGENCE_MISSING_MESSAGE;
	}

	return {
		skipE2E,
		canRunHomologation: !skipE2E && intelligenceConfigured,
		intelligenceConfigured,
		blockReason,
	};
}

/** Returns skip reason when homologation should not run; null when enabled. */
export function getOpenBotHomologationSkipReason(
	env: Record<string, string | undefined> = process.env,
): string | null {
	return resolveOpenBotHomologationPolicy(env).blockReason;
}

/** Fail CI when SKIP_OPENBOT_E2E=0 but Intelligence env is incomplete. */
export function assertOpenBotHomologationEnvForCi(
	env: Record<string, string | undefined> = process.env,
): void {
	const policy = resolveOpenBotHomologationPolicy(env);
	if (!policy.skipE2E && !policy.intelligenceConfigured) {
		throw new Error(
			`${OPENBOT_INTELLIGENCE_MISSING_MESSAGE} — SKIP_OPENBOT_E2E=0 but INTELLIGENCE_* is incomplete`,
		);
	}
}
