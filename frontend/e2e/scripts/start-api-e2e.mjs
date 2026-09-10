import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const apiDir = resolve(repoRoot, "backend/apps/api");
const backendEnv = resolve(repoRoot, "backend/.env");

function loadEnvFile(path) {
	if (!existsSync(path)) {
		return;
	}
	for (const line of readFileSync(path, "utf8").split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) {
			continue;
		}
		const eq = trimmed.indexOf("=");
		if (eq < 1) {
			continue;
		}
		const key = trimmed.slice(0, eq);
		const value = trimmed.slice(eq + 1);
		if (!process.env[key]) {
			process.env[key] = value;
		}
	}
}

loadEnvFile(backendEnv);

if (!process.env.BETTER_AUTH_SECRET) {
	process.env.BETTER_AUTH_SECRET = "e2e-local-not-for-production-32chars!!";
}
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.ALLOW_DEV_SEED = "true";
process.env.NODE_ENV ??= "development";

if (!process.env.DATABASE_URL) {
	console.error("start-api-e2e: DATABASE_URL missing (backend/.env)");
	process.exit(1);
}

const api = spawn("bun", ["run", "src/index.ts"], {
	cwd: apiDir,
	env: process.env,
	stdio: ["ignore", "inherit", "inherit"],
});

api.on("exit", (code) => {
	if (code && code !== 0) {
		process.exit(code);
	}
});

async function waitForHealth() {
	const deadline = Date.now() + 90_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch("http://127.0.0.1:3000/health");
			if (response.ok) {
				return;
			}
		} catch {
			// retry
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error("API health timeout");
}

waitForHealth()
	.then(async () => {
		const seed = spawn("bun", ["run", "src/auth/seed-dev.ts"], {
			cwd: apiDir,
			env: process.env,
			stdio: "inherit",
		});
		await new Promise((resolve, reject) => {
			seed.on("exit", (code) => {
				if (code === 0) {
					resolve(undefined);
				} else {
					reject(new Error(`seed:dev exited ${code}`));
				}
			});
		});
	})
	.catch((error) => {
		console.error(error);
		api.kill();
		process.exit(1);
	});
