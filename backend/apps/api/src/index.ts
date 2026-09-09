import { healthResponseSchema, schemaVersion } from "@anxionos/contracts";
import { createPgPool } from "@anxionos/eventing/postgres";
import { createLogger } from "@anxionos/observability";
import { Elysia } from "elysia";
import { createBetterAuthRuntime, resolveBetterAuthConfig } from "./auth/create-better-auth";
import { bootstrapIdentitySessionRevocation } from "./identity/bootstrap-session-revocation";
import { createIdentityDb } from "@anxionos/identity";

const logger = createLogger({ service: "api" });
const port = Number(process.env.PORT ?? "3000");

const databaseUrl = process.env.DATABASE_URL?.trim();
const pool = databaseUrl ? createPgPool(databaseUrl) : undefined;
if (pool) {
	bootstrapIdentitySessionRevocation(pool);
} else {
	logger.info("DATABASE_URL unset — identity session consumer disabled");
}

let app = new Elysia();

if (pool && resolveBetterAuthConfig()) {
	const identity = createIdentityDb(pool);
	const { auth } = await createBetterAuthRuntime(pool, {
		repository: identity.repository,
		unitOfWork: identity.unitOfWork,
	});
	app = app.all("/api/auth/*", ({ request }) => auth.handler(request));
	logger.info("Better Auth mounted at /api/auth/*");
} else {
	logger.info("Better Auth disabled — set BETTER_AUTH_SECRET and BETTER_AUTH_URL");
}

app = app.get("/health", () => {
		const body = healthResponseSchema.parse({
			status: "ok",
			schemaVersion,
			service: "api",
			timestamp: new Date().toISOString(),
		});
		return body;
	})
	.listen(port);

logger.info("API listening", { port: app.server?.port ?? port });

export type App = typeof app;
