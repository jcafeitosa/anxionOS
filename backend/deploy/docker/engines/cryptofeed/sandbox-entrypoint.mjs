/**
 * Cryptofeed sandbox health surface (ANX-179).
 *
 * Lightweight SIMULATED engine stub — not the full Cryptofeed Python runtime.
 * REAL wiring replaces this with official feed service API once homologated.
 */
import { assertSandboxAuth } from "./shared/sandbox-auth.mjs";
import { createSandboxLogger } from "./shared/sandbox-logger.mjs";

const port = Number(process.env.CRYPTOFEED_SANDBOX_PORT ?? "9058");
const mode = process.env.ENGINE_MODE ?? "SIMULATED";
const version = process.env.CRYPTOFEED_SANDBOX_VERSION ?? "0.1.0-anx179-s1";
const logger = createSandboxLogger("cryptofeed", {
	version,
	service: "cryptofeed-sandbox",
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
				engine: "cryptofeed",
				adapterId: "adapter-cryptofeed",
				mode,
				version,
				simulated: mode === "SIMULATED",
				dataOnly: true,
			});
		}
		if (url.pathname === "/v1/feeds/status") {
			return Response.json({
				status: "ok",
				engine: "cryptofeed-sandbox",
				mode,
				version,
				simulated: true,
				dataOnly: true,
				feedsActive: 0,
			});
		}
		return new Response("not found", { status: 404 });
	},
});

logger.info("sandbox.started", { port: server.port });
