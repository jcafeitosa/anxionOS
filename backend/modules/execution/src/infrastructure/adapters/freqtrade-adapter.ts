import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-162 S3 sandbox (`GET /health`, SIMULATED). */
export interface FqtSandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
}

/**
 * Minimal shape of Freqtrade REST API `GET /api/v1/ping` (REAL runtime oracle).
 * @see https://docs.freqtrade.io/en/latest/rest-api/
 */
export interface FqtRealPingResponse {
	status?: string;
	version?: string;
	simulated?: boolean;
	engine?: string;
}

export type FqtEngineMode = "SIMULATED" | "REAL";

export interface FreqtradeAdapterOptions {
	/** Base URL of the engines slot (default: FREQTRADE_SANDBOX_URL or http://127.0.0.1:${FREQTRADE_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires official Freqtrade runtime (ANX-177). */
	engineMode?: FqtEngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
}

const DEFAULT_FQT_SANDBOX_PORT = "9055";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const FQT_UPSTREAM_REPO = "https://github.com/freqtrade/freqtrade";
const FQT_PINNED_REF = "2024.12"; // G0 — atualizar com evidência de release estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveFqtSandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.FREQTRADE_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port =
		process.env.FREQTRADE_SANDBOX_PORT?.trim() ?? DEFAULT_FQT_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveFqtEngineMode(explicit?: FqtEngineMode): FqtEngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function isHealthySimulatedSandbox(body: FqtSandboxHealthResponse): boolean {
	return (
		body.status === "ok" &&
		body.engine === "freqtrade" &&
		body.simulated === true
	);
}

function isHealthyRealRuntime(body: FqtRealPingResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "freqtrade-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "pong" || status === "ok" || status === "running";
}

/**
 * Freqtrade adapter for the execution sandbox.
 *
 * Infra (ANX-162):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou o slot `freqtrade-sandbox` no profile engines (health/restart).
 *
 * Runtime SIMULATED (ANX-177):
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox S3.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (ANX-177 — wiring parcial, runtime bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /api/v1/ping` (REST API oficial).
 * - Runtime upstream exige Docker + exchange config + credenciais fora
 *   do escopo ANX-177. Sem runtime REAL saudável → STALE (não sucesso simulado).
 *
 * Flow:
 * 1. Licensing validation (schema/versão fixada no G0)
 * 2. Demo + SIMULATED: sandbox health (`GET /health`)
 * 3. Live + REAL: REST ping (`GET /api/v1/ping`) quando ENGINE_MODE=REAL
 *
 * Institutional executionMode is not replaced by Freqtrade dry-run.
 */
export class FreqtradeAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: FqtEngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: FreqtradeAdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveFqtSandboxUrl(options.sandboxUrl);
		this.engineMode = resolveFqtEngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs = options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^FQT-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-162 S3 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: FqtSandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(url, {
				signal: AbortSignal.timeout(this.healthTimeoutMs),
			});
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as FqtSandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes official Freqtrade REST API (`GET /api/v1/ping`).
	 * Requires ENGINE_MODE=REAL and a running upstream runtime — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: FqtRealPingResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/api/v1/ping`;
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
			const body = (await response.json()) as FqtRealPingResponse;
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
export const FREQTRADE_REAL_WIRING_BLOCKERS = {
	upstreamRepo: FQT_UPSTREAM_REPO,
	pinnedRef: FQT_PINNED_REF,
	dockerRuntime:
		"Freqtrade exige container Python + config versionada; homologação REAL separada.",
	restApiAuth: "REST API exige JWT/username+password — fora do escopo ANX-177.",
	exchangeCredentials:
		"Contas live exigem exchange API keys — sem capital real neste slice.",
	dryRunSemantics:
		"dry-run do Freqtrade não substitui executionMode institucional.",
	homologationProfile:
		"ANX-162 S3 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

export function mountFreqtradeAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: FreqtradeAdapterOptions,
) {
	const adapter = new FreqtradeAdapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_fqt_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isFreqtradeAdapter(
	adapterKind: string,
): adapterKind is "FREQTRADE" {
	return adapterKind === "FREQTRADE";
}
