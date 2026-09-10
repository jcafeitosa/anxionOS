import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const viteCache = resolve(frontendRoot, "node_modules/.vite");

rmSync(viteCache, { recursive: true, force: true });

const child = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1", "--port", "4321"], {
	cwd: frontendRoot,
	env: process.env,
	stdio: "inherit",
});

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}
	process.exit(code ?? 0);
});
