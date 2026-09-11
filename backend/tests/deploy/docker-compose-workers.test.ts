import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const DOCKER_DIR = join(REPO_ROOT, "backend/deploy/docker");
const WORKERS_COMPOSE = join(DOCKER_DIR, "docker-compose.workers.yml");
const WORKERS_DOCKERFILE = join(DOCKER_DIR, "workers/Dockerfile");
const DOCKERIGNORE = join(REPO_ROOT, "backend/.dockerignore");

function readText(path: string): string {
	return readFileSync(path, "utf8");
}

describe("docker-compose.workers.yml (ANX-453)", () => {
	it("declares outbox-relay under app-workers profile with compose service DNS", () => {
		const compose = readText(WORKERS_COMPOSE);
		expect(compose).toContain("profiles:");
		expect(compose).toContain("- app-workers");
		expect(compose).toContain("outbox-relay:");
		expect(compose).toContain("WORKER_PROFILE: outbox-relay");
		expect(compose).toContain(
			"DATABASE_URL: postgres://${POSTGRES_USER:-anxionos}:${POSTGRES_PASSWORD:-anxionos}@postgres:5432/${POSTGRES_DB:-anxionos}",
		);
		expect(compose).toContain("NATS_URL: nats://nats:4222");
		expect(compose).toContain("- anxion-data");
		expect(compose).toContain("- anxion-control");
		expect(compose).toContain("postgres:");
		expect(compose).toContain("nats:");
	});

	it("builds from backend root with workers Dockerfile", () => {
		const compose = readText(WORKERS_COMPOSE);
		expect(compose).toContain("context: ../..");
		expect(compose).toContain("dockerfile: deploy/docker/workers/Dockerfile");
		expect(existsSync(WORKERS_DOCKERFILE)).toBe(true);
	});

	it("Dockerfile runs bun src/index.ts with outbox-relay profile", () => {
		const dockerfile = readText(WORKERS_DOCKERFILE);
		expect(dockerfile).toContain("FROM oven/bun:1.4.0-alpine");
		expect(dockerfile).toContain("WORKDIR /app/apps/workers");
		expect(dockerfile).toContain("ENV WORKER_PROFILE=outbox-relay");
		expect(dockerfile).toContain('CMD ["bun", "src/index.ts"]');
		expect(dockerfile).not.toContain("--env-file");
	});

	it("backend .dockerignore excludes node_modules and secrets", () => {
		expect(existsSync(DOCKERIGNORE)).toBe(true);
		const ignore = readText(DOCKERIGNORE);
		expect(ignore).toContain("**/node_modules");
		expect(ignore).toContain("**/.env");
		expect(ignore).toContain(".git");
	});
});
