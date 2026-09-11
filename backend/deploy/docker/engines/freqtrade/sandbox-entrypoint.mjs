/**
 * Freqtrade sandbox health surface (ANX-162 S3 / ANX-177 prelude).
 *
 * Lightweight SIMULATED engine stub — not the full Freqtrade runtime.
 * ANX-177 REAL wiring replaces this with official REST API once homologated.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.FREQTRADE_SANDBOX_PORT ?? "9055");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.FREQTRADE_SANDBOX_VERSION ?? "0.1.0-anx162-s5";
const logger = createSandboxLogger("freqtrade", {
	version,
	service: "freqtrade-sandbox",
});

const server = Bun.serve({
	port,
	hostname: "0.0.0.0",
	fetch(request) {
		const authFailure = assertSandboxAuth(request);
		if (authFailure) {
			logger.warn("sandbox.auth.rejected", {
				path: new URL(request.url).pathname,
			});
			return authFailure;
		}

		const url = new URL(request.url);
		if (url.pathname === "/health") {
			return Response.json({
				status: "ok",
				engine: "freqtrade",
				adapterId: "adapter-freqtrade",
				mode,
				version,
				simulated: mode === "SIMULATED",
			});
		}
		if (url.pathname === "/api/v1/ping") {
			return Response.json({
				status: "ok",
				engine: "freqtrade-sandbox",
				mode,
				version,
				simulated: true,
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
