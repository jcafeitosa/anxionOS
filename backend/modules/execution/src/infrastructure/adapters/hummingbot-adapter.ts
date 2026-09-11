import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-162 S3 sandbox (`GET /health`, SIMULATED). */
export interface HmbSandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
}

/**
 * Minimal shape of Hummingbot Client API status (REAL runtime oracle).
 * @see https://hummingbot.org/docs/
 */
export interface HmbRealStatusResponse {
	status?: string;
	version?: string;
	simulated?: boolean;
	engine?: string;
}

export type HmbEngineMode = "SIMULATED" | "REAL";

export interface HummingbotAdapterOptions {
	/** Base URL of the engines slot (default: HUMMINGBOT_SANDBOX_URL or http://127.0.0.1:${HUMMINGBOT_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires official Hummingbot runtime (ANX-176). */
	engineMode?: HmbEngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
}

const DEFAULT_HMB_SANDBOX_PORT = "9054";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const HMB_UPSTREAM_REPO = "https://github.com/hummingbot/hummingbot";
const HMB_PINNED_REF = "v2.0.0"; // G0 — atualizar com evidência de release estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveHmbSandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.HUMMINGBOT_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port =
		process.env.HUMMINGBOT_SANDBOX_PORT?.trim() ?? DEFAULT_HMB_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveHmbEngineMode(explicit?: HmbEngineMode): HmbEngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function isHealthySimulatedSandbox(body: HmbSandboxHealthResponse): boolean {
	return (
		body.status === "ok" &&
		body.engine === "hummingbot" &&
		body.simulated === true
	);
}

function isHealthyRealRuntime(body: HmbRealStatusResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "hummingbot-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "ok" || status === "success" || status === "running";
}

/**
 * Hummingbot adapter for the execution sandbox.
 *
 * Infra (ANX-162):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou o slot `hummingbot-sandbox` no profile engines (health/restart).
 *
 * Runtime SIMULATED (ANX-176):
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox S3.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (ANX-176 — wiring parcial, runtime bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /v1/status` (Client API oficial).
 * - Runtime upstream exige Docker + connectors + credenciais de exchange fora
 *   do escopo ANX-176. Sem runtime REAL saudável → STALE (não sucesso simulado).
 *
 * Flow:
 * 1. Licensing validation (schema/versão fixada no G0)
 * 2. Demo + SIMULATED: sandbox health (`GET /health`)
 * 3. Live + REAL: Client API status (`GET /v1/status`) quando ENGINE_MODE=REAL
 */
export class HummingbotAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: HmbEngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: HummingbotAdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveHmbSandboxUrl(options.sandboxUrl);
		this.engineMode = resolveHmbEngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs =
			options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^HMB-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-162 S3 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: HmbSandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(url, {
				signal: AbortSignal.timeout(this.healthTimeoutMs),
			});
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as HmbSandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes official Hummingbot Client API (`GET /v1/status`).
	 * Requires ENGINE_MODE=REAL and a running upstream runtime — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: HmbRealStatusResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/v1/status`;
		try {
			const response = await this.fetchFn(
				url,
				buildSandboxFetchInit({
					signal: AbortSignal.timeout(this.healthTimeoutMs),
				}),
			);
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as HmbRealStatusResponse;
			return {
				healthy: isHealthyRealRuntime(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	async validatePermit(_input: RiskPermitValidationInput): Promise<{
		valid: boolean;
		failure?: RiskPermitValidationFailure;
	}> {
		if (!this.licenseValid) {
			return { valid: false, failure: "NOT_ISSUED" };
		}

		if (this.demoAccount.startsWith("demo-")) {
			const { healthy } = await this.checkSandboxHealth();
			if (!healthy) {
				return { valid: false, failure: "STALE" };
			}
			return { valid: true, failure: undefined };
		}

		if (this.engineMode === "REAL") {
			const { healthy } = await this.checkRealRuntimeHealth();
			if (!healthy) {
				return { valid: false, failure: "STALE" };
			}
			return { valid: true, failure: undefined };
		}

		return {
			valid: false,
			failure: "STALE",
		};
	}
}

/** G0 metadata for REAL wiring blockers and ANX-161 conformance handoff. */
export const HMB_REAL_WIRING_BLOCKERS = {
	upstreamRepo: HMB_UPSTREAM_REPO,
	pinnedRef: HMB_PINNED_REF,
	dockerRuntime:
		"Hummingbot exige container Python + connectors; homologação REAL separada.",
	clientApiAuth:
		"Client API exige credenciais e config de connector — fora do escopo ANX-176.",
	exchangeCredentials:
		"Contas live exigem exchange API keys — sem capital real neste slice.",
	homologationProfile:
		"ANX-162 S3 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

export function mountHummingbotAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: HummingbotAdapterOptions,
) {
	const adapter = new HummingbotAdapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_hmb_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isHummingbotAdapter(
	adapterKind: string,
): adapterKind is "HUMMINGBOT" {
	return adapterKind === "HUMMINGBOT";
}
