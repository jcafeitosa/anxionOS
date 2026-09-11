import { describe, expect, it } from "bun:test";
import {
	CUSTOM_DUMP_MAGIC,
	LEDGER_TABLES,
	assertSafeDbName,
	buildDrillReport,
	dockerCopyArgs,
	collectSecretNeedles,
	dumpContainsSecret,
	isCustomFormatDump,
	isForbiddenRestoreTarget,
	parseCliArgs,
	parseDbUrl,
	resolveIsolatedTargetDb,
} from "../../deploy/docker/backup/backup-restore.mjs";

describe("backup-restore.mjs (ANX-169)", () => {
	it("parses backup/restore/drill args", () => {
		expect(parseCliArgs(["backup", "--out", "/tmp/b"])).toEqual({
			cmd: "backup",
			positional: [],
			flags: { out: "/tmp/b" },
		});
		expect(parseCliArgs(["restore", "/tmp/a.dump", "--db-name", "anxionos_restore_drill"])).toEqual({
			cmd: "restore",
			positional: ["/tmp/a.dump"],
			flags: { dbName: "anxionos_restore_drill" },
		});
		expect(parseCliArgs(["drill", "--keep-target"])).toEqual({
			cmd: "drill",
			positional: [],
			flags: { keepTarget: true },
		});
	});

	it("parses DATABASE_URL without printing secrets", () => {
		const parsed = parseDbUrl("postgres://anxionos:s3cret@localhost:5432/anxionos");
		expect(parsed.db).toBe("anxionos");
		expect(parsed.user).toBe("anxionos");
		expect(parsed.password).toBe("s3cret");
	});

	it("refuses restore onto source or production names", () => {
		expect(isForbiddenRestoreTarget("production")).toBe(true);
		expect(isForbiddenRestoreTarget("prod")).toBe(true);
		expect(isForbiddenRestoreTarget("anxionos_production")).toBe(true);
		expect(() => resolveIsolatedTargetDb("anxionos", "anxionos")).toThrow(/differ from source/);
		expect(() => resolveIsolatedTargetDb("anxionos", "production")).toThrow(/forbidden/);
		expect(resolveIsolatedTargetDb("anxionos")).toBe("anxionos_restore_drill");
	});

	it("rejects unsafe SQL identifiers", () => {
		expect(() => assertSafeDbName("anxionos;drop")).toThrow(/identifier/);
		expect(() => assertSafeDbName("")).toThrow(/identifier/);
	});

	it("detects custom-format dump magic and secret leakage", () => {
		expect(isCustomFormatDump(Buffer.from(`${CUSTOM_DUMP_MAGIC}\x01`))).toBe(true);
		expect(isCustomFormatDump(Buffer.from("SQL dump"))).toBe(false);
		expect(dumpContainsSecret("TOC entry 1 TABLE public foo", ["s3cret"])).toBe(false);
		expect(dumpContainsSecret("password=s3cret", ["s3cret"])).toBe(true);
		const needles = collectSecretNeedles(
			{ user: "anxionos", password: "anxionos", db: "anxionos" },
			{ DATABASE_URL: "postgres://anxionos:anxionos@localhost:5432/anxionos" },
		);
		expect(needles.some((n) => n.includes("postgres://anxionos:anxionos@"))).toBe(true);
		expect(needles.includes("anxionos")).toBe(false);
	});

	it("builds drill JSON with required oracle fields", () => {
		const report = buildDrillReport({
			sourceDb: "anxionos",
			targetDb: "anxionos_restore_drill",
			backupMs: 10,
			verifyMs: 20,
			restoreMs: 30,
			tableCount: 4,
			ledger: {
				present: [...LEDGER_TABLES],
				missing: [],
				counts: { accounting_ledger_postings: 0 },
			},
			dataset: { database: "anxionos", dumpFormat: "custom" },
			hardware: { platform: "darwin", cpus: 8 },
			backupFile: "/tmp/x.dump",
			backupSizeBytes: 128,
		});
		expect(report.isolated).toBe(true);
		expect(report.rtoMs).toBe(60);
		expect(report).toHaveProperty("backupMs");
		expect(report).toHaveProperty("verifyMs");
		expect(report).toHaveProperty("restoreMs");
		expect(report).toHaveProperty("tableCount");
		expect(report).toHaveProperty("dataset");
		expect(report).toHaveProperty("hardware");
		expect(report.dumpFormat).toBe("custom");
		expect(report.secretsInDump).toBe(false);
		expect(report.ledger.present).toEqual([...LEDGER_TABLES]);
	});

	it("builds docker cp args instead of a broken host-path dump", () => {
		expect(dockerCopyArgs("from", "docker-postgres-1", "/tmp/a.dump", "/tmp/b.dump")).toEqual([
			"cp",
			"docker-postgres-1:/tmp/a.dump",
			"/tmp/b.dump",
		]);
		expect(dockerCopyArgs("to", "docker-postgres-1", "/tmp/a.dump", "/tmp/b.dump")).toEqual([
			"cp",
			"/tmp/b.dump",
			"docker-postgres-1:/tmp/a.dump",
		]);
	});
});
