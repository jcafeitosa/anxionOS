import { createLogger } from "@anxionos/observability";

/**
 * ANX-485 — log estruturado do erro NAO MAPEADO que vira 500 institucional.
 *
 * O `onError` global do Elysia NAO e' viavel aqui: em Elysia 1.4.30 um handler
 * registrado no app raiz SOBRESCREVE os `onError` dos plugins (verificado por
 * experimento: rota de modulo com error-handler local respondeu pelo handler
 * raiz), o que quebraria o mapeamento de 13 modulos. Por isso o log vive no
 * ponto onde o 500 e' DECIDIDO: o ramo final `status: 500` de cada
 * error-handler de modulo — o lugar em que o detalhe do erro (incl. causa do
 * driver) era descartado sem rastro.
 *
 * O log e' interno (server-side); nunca chega ao corpo da resposta. A
 * exposicao ao CLIENTE fica governada pela politica fail-closed da ANX-484 em
 * `@anxionos/contracts` (`EXPOSE_ERROR_DETAILS` + ambiente).
 */
const logger = createLogger({ service: "api" });

export function logUnhandledBoundaryError(
	error: unknown,
	requestId?: string,
): void {
	logger.error("unhandled boundary error", {
		requestId,
		errorName: error instanceof Error ? error.name : typeof error,
		message: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error && error.stack ? error.stack : undefined,
	});
}
