/**
 * GoCryptoTrader sandbox health surface (ANX-162 S3 / ANX-175 prelude).
 *
 * Lightweight SIMULATED engine stub — not the full GoCryptoTrader binary.
 * ANX-175 replaces this with real terminal wiring once adapter conformance runs.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.GCT_SANDBOX_PORT ?? "9053");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.GCT_SANDBOX_VERSION ?? "0.1.0-anx162-s5";
const logger = createSandboxLogger("gocryptotrader", {
	version,
	service: "gocryptotrader-sandbox",
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
				engine: "gocryptotrader",
				adapterId: "adapter-gocryptotrader",
				mode,
				version,
				simulated: mode === "SIMULATED",
			});
		}
		if (url.pathname === "/v1/getinfo") {
			return Response.json({
				status: "ok",
				engine: "gocryptotrader-sandbox",
				mode,
				version,
				simulated: true,
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
