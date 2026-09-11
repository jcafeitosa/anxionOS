#!/usr/bin/env bun
/**
 * ANX-169 — PostgreSQL/TimescaleDB backup & restore (dev sandbox).
 *
 * Usage:
 *   bun backup-restore.mjs backup [--out DIR]
 *   bun backup-restore.mjs restore FILE [--db-name NAME]
 *   bun backup-restore.mjs drill [--out DIR]   # backup → restore → verify → report RPO/RTO
 *
 * The backup is logical (pg_dump) — suitable for dev/sandbox RPO/RTO proof.
 * Production backup strategy is documented in docs/orchestration (P09).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
if (!DATABASE_URL) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

function fileName(p) { return p.split("/").pop() || p; }

function parseDbUrl(url) {
  const m = url.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
  if (!m) throw new Error("malformed DATABASE_URL");
  return { user: m[1], password: m[2], host: m[3], port: m[4], db: m[5] };
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["pipe", "pipe", "inherit"], ...opts });
}

// Fallback: run via docker exec when CLI is not on host (dev sandbox).
const DOCKER_CONTAINER = process.env.BACKUP_DOCKER_CONTAINER ?? "docker-postgres-1";
function dockerRun(cli, args, opts = {}) {
  return run("docker", ["exec", DOCKER_CONTAINER, cli, ...args], opts);
}
function withPgCli(fn) {
  const inDocker = !!process.env.BACKUP_USE_DOCKER;
  const cli = inDocker ? dockerRun : (c, a, o) => run(c, a, o);
  return fn(cli);
}

async function backup(outDir = join(process.cwd(), "backups")) {
  const { user, password, host, port, db } = parseDbUrl(DATABASE_URL);
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = join(outDir, `${db}-${stamp}.dump`);
  const startedMs = Date.now();
  withPgCli((cli) => cli("pg_dump", ["-h", host, "-p", port, "-U", user, "-d", db, "-Fc", "-f", file], {
    env: { ...process.env, PGPASSWORD: password },
  }));
  const elapsedMs = Date.now() - startedMs;
  const stat = process.env.BACKUP_USE_DOCKER
    ? { size: 0 }
    : statSync(file);
  const sizeBytes = statSync(file).size;
  console.log(JSON.stringify({ ok: true, file, elapsedMs, sizeBytes }));
  return { file, elapsedMs, sizeBytes };
}

async function restore(file, opts = {}) {
  const { user, password, host, port, db } = parseDbUrl(DATABASE_URL);
  const startedMs = Date.now();
  withPgCli((cli) => cli("pg_restore", ["-h", host, "-p", port, "-U", user, "-d", db, "--clean", "--if-exists", file], {
    env: { ...process.env, PGPASSWORD: password },
  }));
  const elapsedMs = Date.now() - startedMs;
  console.log(JSON.stringify({ ok: true, restoredFrom: file, elapsedMs }));
  return { elapsedMs };
}

async function drill() {
  const { db } = parseDbUrl(DATABASE_URL);
  const outDir = process.env.BACKUP_USE_DOCKER ? "/tmp" : "/tmp/anx169-backups";
  console.log("=== ANX-169 disaster drill: backup → restore → verify ===");
  const { file, elapsedMs: backupMs, sizeBytes } = await backup(outDir);
  // Verify backup file is valid
  const verifyMs = Date.now();
  withPgCli((cli) => cli("pg_restore", ["--list", file], { env: { ...process.env } }));
  const listElapsedMs = Date.now() - verifyMs;
  // Restore (to a temp DB to not clobber dev data? For drill we restore same DB)
  const { elapsedMs: restoreMs } = await restore(file, { dbName: db });
  // Verify tables exist
  const { user, password, host, port } = parseDbUrl(DATABASE_URL);
  const tableCount = run("psql", ["-h", host, "-p", port, "-U", user, "-d", db, "-t", "-c", "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"], {
    env: { ...process.env, PGPASSWORD: password },
  }).trim();
  const rtoMs = backupMs + listElapsedMs + restoreMs;
  console.log("=== Resultado do drill ===");
  console.log(JSON.stringify({
    backupMs, listVerifyMs: listElapsedMs, restoreMs, rtoMs,
    tableCount: parseInt(tableCount, 10),
    backupSizeBytes: sizeBytes,
    backupFile: file,
  }, null, 2));
  console.log("RPO: last backup point (logical) — backup was consistent at start.");
  console.log("NOTA: drill em dev sandbox; RPO/RTO de produção exigem WAL archiving + replicas (ANX-169 G2).");
}

const [cmd, arg] = process.argv.slice(2);
const main = { backup, restore, drill };
if (!main[cmd]) {
  console.log("usage: backup-restore.mjs <backup|restore FILE|drill>");
  process.exit(1);
}
if (cmd === "backup") await backup(arg);
else if (cmd === "restore") await restore(arg);
else await drill();
