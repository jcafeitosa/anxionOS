/**
 * Hummingbot sandbox health surface (ANX-162 S3 / ANX-176 prelude).
 *
 * Lightweight SIMULATED engine stub — not the full Hummingbot runtime.
 * ANX-176 REAL wiring replaces this with official Client API once homologated.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.HUMMINGBOT_SANDBOX_PORT ?? "9054");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.HUMMINGBOT_SANDBOX_VERSION ?? "0.1.0-anx162-s5";
const logger = createSandboxLogger("hummingbot", {
	version,
	service: "hummingbot-sandbox",
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
				engine: "hummingbot",
				adapterId: "adapter-hummingbot",
				mode,
				version,
				simulated: mode === "SIMULATED",
			});
		}
		if (url.pathname === "/v1/status") {
			return Response.json({
				status: "ok",
				engine: "hummingbot-sandbox",
				mode,
				version,
				simulated: true,
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
