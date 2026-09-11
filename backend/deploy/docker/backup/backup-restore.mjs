#!/usr/bin/env bun
/**
 * ANX-169 — PostgreSQL/TimescaleDB backup & restore drill (dev sandbox).
 *
 * Usage:
 *   bun backup-restore.mjs backup [--out DIR]
 *   bun backup-restore.mjs restore FILE --db-name NAME
 *   bun backup-restore.mjs drill [--out DIR] [--db-name NAME]
 *
 * Restore always targets an isolated database ≠ source. Names matching
 * production/prod are rejected. Dump is PostgreSQL custom format (-Fc).
 *
 * Logical dump proves sandbox RPO/RTO. Production WAL + replicas: P08 §6.
 *
 * Callers: CLI (import.meta.main); backend/tests/deploy/backup-restore.test.ts.
 * Replaces the previous drill that restored onto the source database.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";

export const LEDGER_TABLES = Object.freeze([
	"accounting_chart_accounts",
	"accounting_journal_entries",
	"accounting_ledger_postings",
	"accounting_command_journal",
]);

export const CUSTOM_DUMP_MAGIC = "PGDMP";

const FORBIDDEN_RESTORE_NAMES = new Set(["production", "prod"]);

export function parseDbUrl(url) {
	if (!url || typeof url !== "string") {
		throw new Error("malformed DATABASE_URL");
	}
	const normalized = url.replace(/^postgres(ql)?:\/\//, "http://");
	let parsed;
	try {
		parsed = new URL(normalized);
	} catch {
		throw new Error("malformed DATABASE_URL");
	}
	const db = assertSafeDbName(
		decodeURIComponent(parsed.pathname.replace(/^\//, "").split("?")[0] ?? ""),
	);
	if (!parsed.username) {
		throw new Error("malformed DATABASE_URL");
	}
	return {
		user: decodeURIComponent(parsed.username),
		password: decodeURIComponent(parsed.password),
		host: parsed.hostname,
		port: parsed.port || "5432",
		db,
	};
}

export function assertSafeDbName(name) {
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(name ?? ""))) {
		throw new Error("database name must be a simple SQL identifier");
	}
	return String(name);
}

export function isForbiddenRestoreTarget(name) {
	const n = String(name ?? "")
		.trim()
		.toLowerCase();
	if (!n) return true;
	if (FORBIDDEN_RESTORE_NAMES.has(n)) return true;
	if (n.includes("production")) return true;
	return false;
}

export function resolveIsolatedTargetDb(sourceDb, requested) {
	const source = assertSafeDbName(String(sourceDb ?? "").trim());
	const target = assertSafeDbName(
		String(requested ?? `${source}_restore_drill`).trim(),
	);
	if (target === source) {
		throw new Error("drill restore target must differ from source database");
	}
	if (isForbiddenRestoreTarget(target)) {
		throw new Error(`restore onto database "${target}" is forbidden`);
	}
	return target;
}

export function parseCliArgs(argv) {
	const args = argv.slice();
	const cmd = args.shift() ?? "";
	const flags = {};
	const positional = [];
	for (let i = 0; i < args.length; i += 1) {
		const token = args[i];
		if (token === "--out" || token === "--db-name") {
			flags[token === "--out" ? "out" : "dbName"] = args[i + 1] ?? "";
			i += 1;
			continue;
		}
		if (token === "--keep-target") {
			flags.keepTarget = true;
			continue;
		}
		positional.push(token);
	}
	return { cmd, positional, flags };
}

export function isCustomFormatDump(bytes) {
	if (!bytes || bytes.length < 5) return false;
	const magic =
		typeof bytes === "string"
			? bytes.slice(0, 5)
			: Buffer.from(bytes.subarray(0, 5)).toString("utf8");
	return magic === CUSTOM_DUMP_MAGIC;
}

export function collectSecretNeedles(parsed, env = process.env) {
	const needles = [];
	if (env.DATABASE_URL) {
		needles.push(env.DATABASE_URL);
	}
	if (
		parsed?.password &&
		parsed.password !== parsed.user &&
		parsed.password !== parsed.db
	) {
		needles.push(parsed.password);
	}
	for (const key of [
		"BETTER_AUTH_SECRET",
		"SEED_OWNER_PASSWORD",
		"SMTP_PASS",
		"NEO4J_PASSWORD",
	]) {
		if (env[key] && env[key] !== parsed?.user && env[key] !== parsed?.db) {
			needles.push(env[key]);
		}
	}
	needles.push("postgres://", "postgresql://", "DATABASE_URL=", "PGPASSWORD=");
	return needles;
}

export function dumpContainsSecret(haystack, secrets) {
	const text = String(haystack ?? "");
	return secrets.filter(Boolean).some((secret) => text.includes(secret));
}

export function collectHardware() {
	const cpus = os.cpus();
	return {
		platform: os.platform(),
		arch: os.arch(),
		cpus: cpus.length,
		cpuModel: cpus[0]?.model ?? "unknown",
		totalMemBytes: os.totalmem(),
		hostname: os.hostname(),
	};
}

export function buildDrillReport(input) {
	return {
		ok: true,
		issue: "ANX-169",
		sourceDb: input.sourceDb,
		targetDb: input.targetDb,
		isolated: input.sourceDb !== input.targetDb,
		backupMs: input.backupMs,
		verifyMs: input.verifyMs,
		restoreMs: input.restoreMs,
		rtoMs: input.backupMs + input.verifyMs + input.restoreMs,
		tableCount: input.tableCount,
		ledger: input.ledger,
		dumpFormat: "custom",
		dumpMagic: CUSTOM_DUMP_MAGIC,
		secretsInDump: false,
		dataset: input.dataset,
		hardware: input.hardware,
		backupFile: input.backupFile,
		backupSizeBytes: input.backupSizeBytes,
	};
}

export function dockerCopyArgs(direction, container, containerPath, hostPath) {
	if (direction === "from") {
		return ["cp", `${container}:${containerPath}`, hostPath];
	}
	if (direction === "to") {
		return ["cp", hostPath, `${container}:${containerPath}`];
	}
	throw new Error(`unknown docker copy direction: ${direction}`);
}

function run(cmd, args, opts = {}) {
	const allowExitOne = opts.allowExitOne === true;
	const rest = { ...opts };
	delete rest.allowExitOne;
	try {
		return execFileSync(cmd, args, {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
			...rest,
		});
	} catch (error) {
		if (allowExitOne && error && error.status === 1) {
			return `${error.stdout ?? ""}${error.stderr ?? ""}`;
		}
		throw error;
	}
}

function dockerContainer() {
	return process.env.BACKUP_DOCKER_CONTAINER ?? "docker-postgres-1";
}

function useDocker() {
	return (
		process.env.BACKUP_USE_DOCKER === "1" ||
		process.env.BACKUP_USE_DOCKER === "true"
	);
}

function pgExec(cli, args, env, opts = {}) {
	if (useDocker()) {
		return run(
			"docker",
			[
				"exec",
				"-e",
				`PGPASSWORD=${env.PGPASSWORD}`,
				dockerContainer(),
				cli,
				...args,
			],
			opts,
		);
	}
	return run(cli, args, { env: { ...process.env, ...env }, ...opts });
}

function copyDumpFromContainer(containerPath, hostPath) {
	run(
		"docker",
		dockerCopyArgs("from", dockerContainer(), containerPath, hostPath),
	);
}

function copyDumpToContainer(hostPath, containerPath) {
	run(
		"docker",
		dockerCopyArgs("to", dockerContainer(), containerPath, hostPath),
	);
}

function pgConnectArgs(parsed, database) {
	if (useDocker()) {
		return ["-h", "127.0.0.1", "-p", "5432", "-U", parsed.user, "-d", database];
	}
	return [
		"-h",
		parsed.host,
		"-p",
		parsed.port,
		"-U",
		parsed.user,
		"-d",
		database,
	];
}

function requireDatabaseUrl() {
	const url = process.env.DATABASE_URL ?? "";
	if (!url) {
		throw new Error("DATABASE_URL required");
	}
	return url;
}

function backupToFile(parsed, hostFile) {
	mkdirSync(join(hostFile, ".."), { recursive: true });
	const startedMs = Date.now();
	const env = { PGPASSWORD: parsed.password };
	if (useDocker()) {
		const containerFile = "/tmp/anxionos-backup.dump";
		pgExec(
			"pg_dump",
			[...pgConnectArgs(parsed, parsed.db), "-Fc", "-f", containerFile],
			env,
		);
		copyDumpFromContainer(containerFile, hostFile);
	} else {
		pgExec(
			"pg_dump",
			[...pgConnectArgs(parsed, parsed.db), "-Fc", "-f", hostFile],
			env,
		);
	}
	return {
		file: hostFile,
		elapsedMs: Date.now() - startedMs,
		sizeBytes: statSync(hostFile).size,
	};
}

function verifyDump(parsed, hostFile) {
	const startedMs = Date.now();
	const bytes = readFileSync(hostFile);
	if (!isCustomFormatDump(bytes)) {
		throw new Error(
			"dump is not PostgreSQL custom format (expected PGDMP magic)",
		);
	}
	const env = { PGPASSWORD: parsed.password };
	let listOutput = "";
	if (useDocker()) {
		const containerFile = "/tmp/anxionos-backup-verify.dump";
		copyDumpToContainer(hostFile, containerFile);
		listOutput = pgExec("pg_restore", ["--list", containerFile], env);
	} else {
		listOutput = pgExec("pg_restore", ["--list", hostFile], env);
	}
	const secrets = collectSecretNeedles(parsed, process.env);
	const dumpAsText = bytes.toString("latin1");
	if (
		dumpContainsSecret(listOutput, secrets) ||
		dumpContainsSecret(dumpAsText, secrets)
	) {
		throw new Error("dump listing leaked a secret");
	}
	return { verifyMs: Date.now() - startedMs, listOutput };
}

function quoteIdent(name) {
	return `"${String(name).replaceAll('"', '""')}"`;
}

function terminateAndDrop(parsed, targetDb) {
	const env = { PGPASSWORD: parsed.password };
	pgExec(
		"psql",
		[
			...pgConnectArgs(parsed, "postgres"),
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${assertSafeDbName(targetDb)}' AND pid <> pg_backend_pid();`,
		],
		env,
	);
	pgExec(
		"psql",
		[
			...pgConnectArgs(parsed, "postgres"),
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			`DROP DATABASE IF EXISTS ${quoteIdent(targetDb)};`,
		],
		env,
	);
}

function ensureIsolatedDatabase(parsed, targetDb) {
	const env = { PGPASSWORD: parsed.password };
	terminateAndDrop(parsed, targetDb);
	pgExec(
		"psql",
		[
			...pgConnectArgs(parsed, "postgres"),
			"-v",
			"ON_ERROR_STOP=1",
			"-c",
			`CREATE DATABASE ${quoteIdent(targetDb)};`,
		],
		env,
	);
}

function restoreToDatabase(parsed, hostFile, targetDb) {
	if (isForbiddenRestoreTarget(targetDb) || targetDb === parsed.db) {
		throw new Error(`refusing restore onto "${targetDb}"`);
	}
	const startedMs = Date.now();
	const env = { PGPASSWORD: parsed.password };
	if (useDocker()) {
		const containerFile = "/tmp/anxionos-restore.dump";
		copyDumpToContainer(hostFile, containerFile);
		pgExec(
			"pg_restore",
			[
				...pgConnectArgs(parsed, targetDb),
				"--clean",
				"--if-exists",
				containerFile,
			],
			env,
			{ allowExitOne: true },
		);
	} else {
		pgExec(
			"pg_restore",
			[...pgConnectArgs(parsed, targetDb), "--clean", "--if-exists", hostFile],
			env,
			{ allowExitOne: true },
		);
	}
	return { restoreMs: Date.now() - startedMs };
}

function queryLedger(parsed, targetDb) {
	const env = { PGPASSWORD: parsed.password };
	const tableCountRaw = pgExec(
		"psql",
		[
			...pgConnectArgs(parsed, targetDb),
			"-t",
			"-A",
			"-c",
			"SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';",
		],
		env,
	).trim();
	const inList = LEDGER_TABLES.map((n) => `'${n}'`).join(",");
	const namesRaw = pgExec(
		"psql",
		[
			...pgConnectArgs(parsed, targetDb),
			"-t",
			"-A",
			"-c",
			`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN (${inList}) ORDER BY 1;`,
		],
		env,
	).trim();
	const present = namesRaw ? namesRaw.split("\n").filter(Boolean) : [];
	const missing = LEDGER_TABLES.filter((name) => !present.includes(name));
	const counts = {};
	for (const name of present) {
		counts[name] = Number.parseInt(
			pgExec(
				"psql",
				[
					...pgConnectArgs(parsed, targetDb),
					"-t",
					"-A",
					"-c",
					`SELECT count(*) FROM ${quoteIdent(name)};`,
				],
				env,
			).trim(),
			10,
		);
	}
	return {
		tableCount: Number.parseInt(tableCountRaw, 10),
		ledger: { present, missing, counts },
	};
}

export async function backup(outDir = join(process.cwd(), "backups")) {
	const parsed = parseDbUrl(requireDatabaseUrl());
	mkdirSync(outDir, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const file = join(outDir, `${parsed.db}-${stamp}.dump`);
	const result = backupToFile(parsed, file);
	console.log(
		JSON.stringify({
			ok: true,
			file: result.file,
			elapsedMs: result.elapsedMs,
			sizeBytes: result.sizeBytes,
		}),
	);
	return result;
}

export async function restore(file, dbName) {
	const parsed = parseDbUrl(requireDatabaseUrl());
	const targetDb = resolveIsolatedTargetDb(parsed.db, dbName);
	if (!file || !existsSync(file)) {
		throw new Error("restore FILE is required and must exist");
	}
	ensureIsolatedDatabase(parsed, targetDb);
	const { restoreMs } = restoreToDatabase(parsed, file, targetDb);
	console.log(
		JSON.stringify({
			ok: true,
			restoredFrom: file,
			targetDb,
			elapsedMs: restoreMs,
		}),
	);
	return { restoreMs, targetDb };
}

export async function drill(opts = {}) {
	const parsed = parseDbUrl(requireDatabaseUrl());
	const targetDb = resolveIsolatedTargetDb(
		parsed.db,
		opts.dbName ?? process.env.BACKUP_DRILL_TARGET_DB,
	);
	const outDir = opts.out ?? join(os.tmpdir(), "anx169-backups");
	mkdirSync(outDir, { recursive: true });
	const stamp = new Date().toISOString().replace(/[:.]/g, "-");
	const hostFile = join(outDir, `${parsed.db}-${stamp}.dump`);

	console.log(
		"=== ANX-169 disaster drill: backup → isolated restore → ledger verify ===",
	);
	const { elapsedMs: backupMs, sizeBytes } = backupToFile(parsed, hostFile);
	const { verifyMs } = verifyDump(parsed, hostFile);
	ensureIsolatedDatabase(parsed, targetDb);
	const { restoreMs } = restoreToDatabase(parsed, hostFile, targetDb);
	const { tableCount, ledger } = queryLedger(parsed, targetDb);

	const report = buildDrillReport({
		sourceDb: parsed.db,
		targetDb,
		backupMs,
		verifyMs,
		restoreMs,
		tableCount,
		ledger,
		dataset: {
			database: parsed.db,
			targetDb,
			mode: useDocker() ? "docker-exec" : "host-cli",
			dumpFormat: "custom",
		},
		hardware: collectHardware(),
		backupFile: hostFile,
		backupSizeBytes: sizeBytes,
	});

	console.log("=== Resultado do drill ===");
	console.log(JSON.stringify(report, null, 2));
	console.log(
		"RPO: ponto do dump lógico no início do backup (sandbox). Não é SLO de produção.",
	);
	console.log(
		"RTO: backupMs + verifyMs + restoreMs no hardware reportado. Destino isolado ≠ origem.",
	);

	if (!opts.keepTarget && !process.env.BACKUP_KEEP_TARGET) {
		terminateAndDrop(parsed, targetDb);
	}
	return report;
}

export async function main(argv = process.argv.slice(2)) {
	const { cmd, positional, flags } = parseCliArgs(argv);
	if (cmd === "backup") {
		await backup(flags.out ?? positional[0]);
		return;
	}
	if (cmd === "restore") {
		await restore(positional[0], flags.dbName);
		return;
	}
	if (cmd === "drill") {
		await drill({
			out: flags.out,
			dbName: flags.dbName,
			keepTarget: flags.keepTarget,
		});
		return;
	}
	console.log(
		"usage: backup-restore.mjs <backup|restore FILE --db-name NAME|drill> [--out DIR]",
	);
	process.exit(1);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		process.exit(1);
	}
}
