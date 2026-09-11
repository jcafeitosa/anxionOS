import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-174 sandbox (`GET /health`, SIMULATED). */
export interface NtsSandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
}

/**
 * Minimal shape of NautilusTrader system status (REAL runtime oracle).
 * @see https://nautilustrader.io/docs/latest/
 */
export interface NtsRealStatusResponse {
	status?: string;
	version?: string;
	simulated?: boolean;
	engine?: string;
	traderId?: string;
}

export type NtsEngineMode = "SIMULATED" | "REAL";

export interface NautilusTraderAdapterOptions {
	/** Base URL of the engines slot (default: NAUTILUS_SANDBOX_URL or http://127.0.0.1:${NAUTILUS_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires official NautilusTrader runtime. */
	engineMode?: NtsEngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
}

const DEFAULT_NTS_SANDBOX_PORT = "9057";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const NTS_UPSTREAM_REPO = "https://github.com/nautechsystems/nautilus_trader";
const NTS_PINNED_REF = "1.210.0"; // G0 — atualizar com evidência de release estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveNtsSandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.NAUTILUS_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port =
		process.env.NAUTILUS_SANDBOX_PORT?.trim() ?? DEFAULT_NTS_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveNtsEngineMode(explicit?: NtsEngineMode): NtsEngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function isHealthySimulatedSandbox(body: NtsSandboxHealthResponse): boolean {
	return (
		body.status === "ok" &&
		body.engine === "nautilus" &&
		body.simulated === true
	);
}

function isHealthyRealRuntime(body: NtsRealStatusResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "nautilus-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "ok" || status === "running" || status === "ready";
}

/**
 * NautilusTrader adapter for the execution sandbox (ANX-174).
 *
 * Infra (ANX-162 quartet + ANX-174 extension):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou quartet; ANX-174 adiciona slot `nautilus-sandbox` (:9057).
 *
 * Runtime SIMULATED:
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (wiring parcial, runtime bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /v1/system/status`.
 * - Runtime upstream exige container Python/Rust + catalog config.
 *   Sem runtime REAL saudável → STALE (não sucesso simulado).
 */
export class NautilusTraderAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: NtsEngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: NautilusTraderAdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveNtsSandboxUrl(options.sandboxUrl);
		this.engineMode = resolveNtsEngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs = options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^NTS-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-174 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: NtsSandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(url, {
				signal: AbortSignal.timeout(this.healthTimeoutMs),
			});
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as NtsSandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes official NautilusTrader system API (`GET /v1/system/status`).
	 * Requires ENGINE_MODE=REAL and a running upstream runtime — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: NtsRealStatusResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/v1/system/status`;
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
			const body = (await response.json()) as NtsRealStatusResponse;
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
export const NAUTILUS_REAL_WIRING_BLOCKERS = {
	upstreamRepo: NTS_UPSTREAM_REPO,
	pinnedRef: NTS_PINNED_REF,
	dockerRuntime:
		"NautilusTrader exige container Python/Rust + data catalog versionado; homologação REAL separada.",
	systemApiAuth:
		"System API exige config de trader/node — fora do escopo SIMULATED.",
	liveCredentials:
		"Contas live exigem venue API keys — sem capital real neste slice.",
	backtestSemantics:
		"Backtest do Nautilus não substitui executionMode institucional.",
	homologationProfile:
		"ANX-174 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

export function mountNautilusTraderAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: NautilusTraderAdapterOptions,
) {
	const adapter = new NautilusTraderAdapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_nts_${organizationId}`;
	return { adapter, venueAdapterRefId };
}

export function isNautilusTraderAdapter(
	adapterKind: string,
): adapterKind is "NAUTILUS_TRADER" {
	return adapterKind === "NAUTILUS_TRADER";
}
