import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-179 sandbox (`GET /health`, SIMULATED). */
export interface CfsSandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
	dataOnly?: boolean;
}

/**
 * Minimal shape of Cryptofeed feed service status (REAL runtime oracle).
 * @see https://github.com/bmoscon/cryptofeed
 */
export interface CfsRealStatusResponse {
	status?: string;
	version?: string;
	simulated?: boolean;
	engine?: string;
	dataOnly?: boolean;
	feedsActive?: number;
}

export type CfsEngineMode = "SIMULATED" | "REAL";

export interface CryptofeedAdapterOptions {
	/** Base URL of the engines slot (default: CRYPTOFEED_SANDBOX_URL or http://127.0.0.1:${CRYPTOFEED_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires official Cryptofeed Python runtime. */
	engineMode?: CfsEngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
}

const DEFAULT_CFS_SANDBOX_PORT = "9058";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const CFS_UPSTREAM_REPO = "https://github.com/bmoscon/cryptofeed";
const CFS_PINNED_REF = "2.4.1"; // G0 — atualizar com evidência de release estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveCfsSandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.CRYPTOFEED_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port =
		process.env.CRYPTOFEED_SANDBOX_PORT?.trim() ?? DEFAULT_CFS_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveCfsEngineMode(explicit?: CfsEngineMode): CfsEngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function isHealthySimulatedSandbox(body: CfsSandboxHealthResponse): boolean {
	return (
		body.status === "ok" &&
		body.engine === "cryptofeed" &&
		body.simulated === true &&
		body.dataOnly === true
	);
}

function isHealthyRealRuntime(body: CfsRealStatusResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "cryptofeed-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "ok" || status === "running" || status === "ready";
}

/**
 * Cryptofeed adapter for the market-data sandbox (ANX-179).
 *
 * Infra (ANX-162 quartet + ANX-179 extension):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou quartet; ANX-179 adiciona slot `cryptofeed-sandbox` (:9058).
 *
 * Runtime SIMULATED:
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (wiring parcial, runtime bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /v1/feeds/status`.
 * - Runtime upstream exige container Python + exchange connectors.
 *   Sem runtime REAL saudável → STALE (não sucesso simulado).
 */
export class CryptofeedAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: CfsEngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: CryptofeedAdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveCfsSandboxUrl(options.sandboxUrl);
		this.engineMode = resolveCfsEngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs =
			options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^CFS-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-179 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: CfsSandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(url, {
				signal: AbortSignal.timeout(this.healthTimeoutMs),
			});
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as CfsSandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes official Cryptofeed feed service API (`GET /v1/feeds/status`).
	 * Requires ENGINE_MODE=REAL and a running upstream runtime — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: CfsRealStatusResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/v1/feeds/status`;
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
			const body = (await response.json()) as CfsRealStatusResponse;
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
export const CFS_REAL_WIRING_BLOCKERS = {
	upstreamRepo: CFS_UPSTREAM_REPO,
	pinnedRef: CFS_PINNED_REF,
	dockerRuntime:
		"Cryptofeed exige container Python + exchange connectors; homologação REAL separada.",
	feedServiceAuth:
		"Feed service exige credenciais de exchange — fora do escopo SIMULATED.",
	exchangeCredentials:
		"Feeds live exigem exchange API keys — sem capital real neste slice.",
	dataOnlySemantics:
		"Cryptofeed é data-only — não substitui executionMode institucional.",
	homologationProfile:
		"ANX-179 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

export function mountCryptofeedAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: CryptofeedAdapterOptions,
) {
	const adapter = new CryptofeedAdapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_cfs_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isCryptofeedAdapter(
	adapterKind: string,
): adapterKind is "CRYPTOFEED" {
	return adapterKind === "CRYPTOFEED";
}
