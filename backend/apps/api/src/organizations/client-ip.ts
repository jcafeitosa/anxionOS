import { AppError } from "@anxionos/contracts/errors";

export interface RequestIpServer {
	requestIP?(request: Request): { address: string } | null;
}

export type RequestIpResolver =
	| RequestIpServer
	| ((request: Request) => { address?: string } | null);

export function isTrustProxyEnabled(): boolean {
	const raw = process.env.TRUST_PROXY?.trim().toLowerCase();
	return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * ANX-491 — número de proxies confiáveis entre o cliente e a API, usado para
 * derivar o IP do cliente do `X-Forwarded-For` pelo hop mais à direita não
 * confiável (`clientIpFromTrustedHeaders`).
 *
 * Default 1, justificado: o cenário de deploy documentado (backend/.env.example)
 * é exatamente um reverse proxy/load balancer confiável na frente da API (nginx
 * `proxy_add_x_forwarded_for`, ALB), que acrescenta uma entrada com o endereço
 * real do cliente ao final do header. Com 1 hop, o valor derivado é o que o
 * proxy imediato registrou — o único da cadeia que o cliente não consegue
 * escrever. Um default 0 quebraria instalações existentes que só ligam
 * `TRUST_PROXY=true` (nenhum hop confiável → header ignorado → toda a chave de
 * rate limit vira o IP da conexão, i.e. o IP do proxy — bucket compartilhado
 * global e falso 429 para todos atrás dele).
 *
 * Operador: configurar com o número REAL de proxies da cadeia. Subestimar é
 * seguro (a chave vira o endereço de um proxy — bucket compartilhado mais
 * estrito); SUPERESTIMAR faz a API confiar em um valor que o cliente controla
 * — nunca configurar acima da cadeia real.
 *
 * Valores inválidos (não numéricos, negativos) caem no default documentado,
 * seguindo o padrão de env do módulo (ex.: `resolveRealtimeMaxChannels*`).
 */
export const DEFAULT_TRUSTED_PROXY_HOPS = 1;

export function resolveTrustedProxyHops(): number {
	const raw = process.env.TRUSTED_PROXY_HOPS?.trim();
	if (!raw) {
		return DEFAULT_TRUSTED_PROXY_HOPS;
	}
	const parsed = Number.parseInt(raw, 10);
	return Number.isFinite(parsed) && parsed >= 0
		? parsed
		: DEFAULT_TRUSTED_PROXY_HOPS;
}

/**
 * ANX-491 — deriva o endereço do cliente do `X-Forwarded-For` pelo hop mais à
 * direita NÃO confiável, em vez do valor mais à esquerda (controlado pelo
 * cliente e preservado à esquerda por proxies que APENDEM — nginx
 * `proxy_add_x_forwarded_for`, ALB), que permitia contornar o rate limit
 * rotacionando o header.
 *
 * Cada proxy confiável acrescenta uma entrada com o endereço do seu peer:
 *
 *   [forjado pelo cliente ...] , cliente , proxy1 , ... , proxy(N-1)
 *   ^^^^^^^^^^^^^^^^^^^^^^^^^^            ^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *   controlado pelo cliente               N entradas escritas pela infra
 *
 * O cliente observado pelo PRIMEIRO proxy confiável está no índice
 * `hops.length - trustedProxyHops` — o primeiro valor que a infraestrutura
 * confiável garantidamente escreveu; tudo à esquerda dele é controlado pelo
 * cliente e é ignorado. Com hops=1 o valor derivado é a entrada mais à direita.
 *
 * `X-Real-IP` NÃO é mais aceito neste caminho (era fallback do código antigo):
 * é um header único sem estrutura de hops, então não há como pinar um valor
 * que o proxy tenha garantidamente escrito — o cliente poderia rotacioná-lo
 * sempre que o proxy não o sobrescrever, reabrindo o bypass da ANX-491. O
 * proxy DEVE produzir `X-Forwarded-For` (append ou overwrite) quando
 * `TRUST_PROXY=true`.
 */
function clientIpFromTrustedHeaders(
	request: Request,
	trustedProxyHops: number,
): string | undefined {
	if (trustedProxyHops <= 0) {
		return undefined;
	}
	const raw = request.headers.get("x-forwarded-for");
	if (!raw) {
		return undefined;
	}
	const hops = raw
		.split(",")
		.map((hop) => hop.trim())
		.filter((hop) => hop.length > 0);
	const clientIndex = hops.length - trustedProxyHops;
	if (clientIndex < 0) {
		// Header mais curto que a cadeia configurada: nenhum hop confiável pode
		// ser pinado — não confia no header, segue para o IP da conexão.
		return undefined;
	}
	return hops[clientIndex] || undefined;
}

function clientIpFromConnection(
	request: Request,
	server?: RequestIpResolver,
): string | undefined {
	const address =
		typeof server === "function"
			? server(request)?.address?.trim()
			: server?.requestIP?.(request)?.address?.trim();
	return address || undefined;
}

/**
 * ANX-486 — o codigo tem de pertencer ao enum canonico `ERROR_CODES`. Antes esta
 * funcao mutava um `AppError` via `Object.defineProperty` para um codigo
 * `CLIENT_IP_UNAVAILABLE` que **nao existe** no catalogo: como `isAppError()`
 * curto-circuita em `instanceof`, o boundary emitia esse codigo cru e o envelope
 * ficava **invalido** contra `errorResponseSchema`/OpenAPI. Agora usa o codigo
 * canonico de 503 e leva o motivo em `details.code`.
 */
function clientIpUnavailable(): never {
	throw new AppError({
		code: "SERVICE_UNAVAILABLE",
		message: "Client IP could not be determined for rate limiting",
		details: { code: "CLIENT_IP_UNAVAILABLE" },
		expose: true,
	});
}

export function resolveClientIp(
	request: Request,
	server?: RequestIpResolver,
): string {
	if (isTrustProxyEnabled()) {
		const trusted = clientIpFromTrustedHeaders(
			request,
			resolveTrustedProxyHops(),
		);
		if (trusted) {
			return trusted;
		}
	}
	const connectionIp = clientIpFromConnection(request, server);
	if (connectionIp) {
		return connectionIp;
	}
	return clientIpUnavailable();
}
