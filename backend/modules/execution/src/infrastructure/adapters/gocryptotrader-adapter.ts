import type {
	RiskPermitValidationFailure,
	RiskPermitValidationInput,
	RiskPermitValidationPort,
} from "../../domain/ports/risk-permit-validation";
import { buildSandboxFetchInit } from "./sandbox-auth";

/** Health payload from ANX-162 S3 sandbox (`GET /health`, SIMULATED). */
export interface GctSandboxHealthResponse {
	status: string;
	engine: string;
	adapterId?: string;
	mode: string;
	version: string;
	simulated: boolean;
}

/**
 * Minimal shape of GoCryptoTrader gRPC-proxy `GET /v1/getinfo` (REAL runtime oracle).
 * @see https://github.com/thrasher-corp/gocryptotrader gctrpc + grpc-gateway
 */
export interface GctRealInfoResponse {
	status?: string;
	version?: string;
	uptime?: string;
	simulated?: boolean;
	engine?: string;
}

export type GctEngineMode = "SIMULATED" | "REAL";

export interface GoCryptoTraderAdapterOptions {
	/** Base URL of the engines slot (default: GCT_SANDBOX_URL or http://127.0.0.1:${GCT_SANDBOX_PORT}). */
	sandboxUrl?: string;
	/** Runtime mode gate — REAL requires official GCT binary + gRPC proxy (ANX-175). */
	engineMode?: GctEngineMode;
	fetchFn?: typeof fetch;
	healthTimeoutMs?: number;
	/** Basic auth user for GCT gRPC JSON proxy (env: GCT_RPC_USER). */
	rpcUser?: string;
	/** Basic auth password (env: GCT_RPC_PASSWORD). */
	rpcPassword?: string;
	/** Allow self-signed TLS for local GCT (env: GCT_RPC_INSECURE_TLS=true). */
	rpcInsecureTls?: boolean;
}

const DEFAULT_GCT_SANDBOX_PORT = "9053";
const DEFAULT_HEALTH_TIMEOUT_MS = 5000;
const GCT_UPSTREAM_REPO = "https://github.com/thrasher-corp/gocryptotrader";
const GCT_PINNED_REF = "v1.0.0"; // G0 — atualizar com evidência de release estável

function trimTrailingSlash(url: string): string {
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function resolveGctSandboxUrl(explicit?: string): string {
	if (explicit?.trim()) {
		return trimTrailingSlash(explicit.trim());
	}
	const fromEnv = process.env.GCT_SANDBOX_URL?.trim();
	if (fromEnv) {
		return trimTrailingSlash(fromEnv);
	}
	const port = process.env.GCT_SANDBOX_PORT?.trim() ?? DEFAULT_GCT_SANDBOX_PORT;
	return `http://127.0.0.1:${port}`;
}

export function resolveGctEngineMode(explicit?: GctEngineMode): GctEngineMode {
	const raw = (explicit ?? process.env.ENGINE_MODE ?? "SIMULATED").trim();
	return raw.toUpperCase() === "REAL" ? "REAL" : "SIMULATED";
}

function resolveRpcCredentials(options: GoCryptoTraderAdapterOptions): {
	user?: string;
	password?: string;
	insecureTls: boolean;
} {
	return {
		user: options.rpcUser ?? process.env.GCT_RPC_USER?.trim(),
		password: options.rpcPassword ?? process.env.GCT_RPC_PASSWORD?.trim(),
		insecureTls:
			options.rpcInsecureTls ??
			process.env.GCT_RPC_INSECURE_TLS?.trim().toLowerCase() === "true",
	};
}

function isHealthySimulatedSandbox(body: GctSandboxHealthResponse): boolean {
	return (
		body.status === "ok" &&
		body.engine === "gocryptotrader" &&
		body.simulated === true
	);
}

function isHealthyRealRuntime(body: GctRealInfoResponse): boolean {
	if (body.simulated === true) {
		return false;
	}
	if (body.engine === "gocryptotrader-sandbox") {
		return false;
	}
	const status = body.status?.toLowerCase();
	return status === "ok" || status === "success" || status === "running";
}

function buildFetchInit(
	options: GoCryptoTraderAdapterOptions,
	timeoutMs: number,
): RequestInit & { tls?: { rejectUnauthorized: boolean } } {
	const creds = resolveRpcCredentials(options);
	const headers: Record<string, string> = {};
	if (creds.user && creds.password) {
		const token = Buffer.from(`${creds.user}:${creds.password}`).toString(
			"base64",
		);
		headers.Authorization = `Basic ${token}`;
	}
	const init: RequestInit & { tls?: { rejectUnauthorized: boolean } } = {
		signal: AbortSignal.timeout(timeoutMs),
		headers,
	};
	if (creds.insecureTls) {
		init.tls = { rejectUnauthorized: false };
	}
	return init;
}

/**
 * GoCryptoTrader Adapter for execution sandbox.
 *
 * Infra (ANX-162):
 * - S2 homologou storage/rede Docker (volumes, networks, limites).
 * - S3 homologou o slot `gocryptotrader-sandbox` no profile engines (health/restart).
 *
 * Runtime SIMULATED (ANX-175):
 * - Modo demo (`demo-*`) valida licença localmente e exige `/health` do sandbox S3.
 * - Indisponibilidade do sandbox não é sucesso simulado — retorna STALE.
 *
 * Runtime REAL (ANX-175 — wiring parcial, binário bloqueado):
 * - `ENGINE_MODE=REAL` habilita oracle `GET /v1/getinfo` (gRPC JSON proxy oficial).
 * - Binário upstream não publicado; imagem oficial exige TLS+basic auth, build from source
 *   ({@link GCT_UPSTREAM_REPO}, ref {@link GCT_PINNED_REF}) e credenciais de exchange fora
 *   do escopo ANX-175. Sem runtime REAL saudável → STALE (não sucesso simulado).
 *
 * Flow:
 * 1. Licensing validation (schema/versão fixada no G0)
 * 2. Demo + SIMULATED: sandbox health (`GET /health`)
 * 3. Live + REAL: gRPC-proxy getinfo (`GET /v1/getinfo`) quando ENGINE_MODE=REAL
 */
export class GoCryptoTraderAdapter implements RiskPermitValidationPort {
	private readonly licenseValid: boolean;
	private readonly demoAccount: string;
	private readonly sandboxUrl: string;
	private readonly engineMode: GctEngineMode;
	private readonly fetchFn: typeof fetch;
	private readonly healthTimeoutMs: number;
	private readonly options: GoCryptoTraderAdapterOptions;

	constructor(
		licenseKey: string,
		demoAccountId: string,
		options: GoCryptoTraderAdapterOptions = {},
	) {
		this.licenseValid = this.validateLicenseFormat(licenseKey);
		this.demoAccount = demoAccountId;
		this.sandboxUrl = resolveGctSandboxUrl(options.sandboxUrl);
		this.engineMode = resolveGctEngineMode(options.engineMode);
		this.fetchFn = options.fetchFn ?? fetch;
		this.healthTimeoutMs = options.healthTimeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
		this.options = options;
	}

	private validateLicenseFormat(license: string): boolean {
		const licenseRegex = /^GCT-LICENSE-[0-9a-f-]{36}-\d+\.\d+\.\d+$/i;
		return licenseRegex.test(license);
	}

	/** Probes ANX-162 S3 sandbox health oracle (`GET /health`). */
	async checkSandboxHealth(): Promise<{
		healthy: boolean;
		body?: GctSandboxHealthResponse;
	}> {
		const url = `${this.sandboxUrl}/health`;
		try {
			const response = await this.fetchFn(
				url,
				buildFetchInit(this.options, this.healthTimeoutMs),
			);
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as GctSandboxHealthResponse;
			return {
				healthy: isHealthySimulatedSandbox(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	/**
	 * Probes official GoCryptoTrader gRPC JSON proxy (`GET /v1/getinfo`).
	 * Requires ENGINE_MODE=REAL and a running upstream binary — not the Bun stub.
	 */
	async checkRealRuntimeHealth(): Promise<{
		healthy: boolean;
		body?: GctRealInfoResponse;
	}> {
		if (this.engineMode !== "REAL") {
			return { healthy: false };
		}
		const url = `${this.sandboxUrl}/v1/getinfo`;
		try {
			const response = await this.fetchFn(
				url,
				buildSandboxFetchInit(
					buildFetchInit(this.options, this.healthTimeoutMs),
				),
			);
			if (!response.ok) {
				return { healthy: false };
			}
			const body = (await response.json()) as GctRealInfoResponse;
			return {
				healthy: isHealthyRealRuntime(body),
				body,
			};
		} catch {
			return { healthy: false };
		}
	}

	async validatePermit(input: RiskPermitValidationInput): Promise<{
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
export const GCT_REAL_WIRING_BLOCKERS = {
	upstreamRepo: GCT_UPSTREAM_REPO,
	pinnedRef: GCT_PINNED_REF,
	noPublishedBinaries:
		"Upstream não publica binários estáveis; build from source obrigatório.",
	grpcProxyTls:
		"gRPC JSON proxy exige TLS self-signed + basic auth (remoteControl.gRPC).",
	exchangeCredentials:
		"Contas live exigem exchange API keys — fora do escopo ANX-175 (sem capital real).",
	homologationProfile:
		"ANX-162 S3 homologa SIMULATED only; REAL exige profile/issue própria.",
} as const;

/**
 * Mount the GoCryptoTrader adapter into the execution unit of work.
 */
export function mountGoCryptoTraderAdapter(
	organizationId: string,
	licenseKey: string,
	demoAccountId: string,
	options?: GoCryptoTraderAdapterOptions,
) {
	const adapter = new GoCryptoTraderAdapter(licenseKey, demoAccountId, options);
	const venueAdapterRefId = `ex_vad_goc_${organizationId}`;

	return { adapter, venueAdapterRefId };
}

export function isGoCryptoTraderAdapter(
	adapterKind: string,
): adapterKind is "GO_CRYPTO_TRADER" {
	return adapterKind === "GO_CRYPTO_TRADER";
}
