import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
	createSecretVaultFromEnv,
	DevVaultNotAllowedError,
	IdempotentSecretRotation,
	LocalFileSecretVault,
	assertNoPlaintextSecrets,
	redactString,
	redactValue,
	resolveLocalVaultPath,
	resolveRotationJournalPath,
} from "@anxionos/secrets";

function withEnv(
	overrides: Record<string, string | undefined>,
	fn: () => void | Promise<void>,
): Promise<void> {
	const previous: Record<string, string | undefined> = {};
	for (const [key, value] of Object.entries(overrides)) {
		previous[key] = process.env[key];
		if (value === undefined) {
			delete process.env[key];
		} else {
			process.env[key] = value;
		}
	}
	return Promise.resolve(fn()).finally(() => {
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	});
}

describe("secrets redaction", () => {
	test("redacts bearer tokens and sensitive keys", () => {
		const input = {
			apiKey: "sk-test-abcdefghijklmnopqrstuvwxyz",
			note: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
		};
		const redacted = redactValue(input) as Record<string, string>;
		expect(redacted.apiKey).toBe("[REDACTED]");
		expect(redacted.note).toContain("[REDACTED]");
		expect(redactString("Bearer abc.def.ghi")).toContain("[REDACTED]");
	});

	test("assertNoPlaintextSecrets rejects bearer material", () => {
		expect(() => assertNoPlaintextSecrets({ token: "Bearer abc" })).toThrow();
	});
});

describe("dev vault production guard", () => {
	test("blocks ENABLE_DEV_VAULT when NODE_ENV=production", async () => {
		await withEnv(
			{ NODE_ENV: "production", ENABLE_DEV_VAULT: "true" },
			() => {
				expect(() => resolveLocalVaultPath()).toThrow(DevVaultNotAllowedError);
				expect(() => createSecretVaultFromEnv()).toThrow(
					DevVaultNotAllowedError,
				);
			},
		);
	});

	test("blocks SECRETS_LOCAL_VAULT_PATH when NODE_ENV=production", async () => {
		await withEnv(
			{
				NODE_ENV: "production",
				SECRETS_LOCAL_VAULT_PATH: "/tmp/dev-vault.json",
			},
			() => {
				expect(() => resolveLocalVaultPath()).toThrow(DevVaultNotAllowedError);
			},
		);
	});

	test("blocks LocalFileSecretVault constructor in production", async () => {
		await withEnv({ NODE_ENV: "production" }, () => {
			expect(
				() => new LocalFileSecretVault({ vaultPath: "/tmp/vault.json" }),
			).toThrow(DevVaultNotAllowedError);
		});
	});
});

describe("local file vault", () => {
	test("stores versions and rotates idempotently", async () => {
		await withEnv({ NODE_ENV: "test" }, async () => {
			const dir = await mkdtemp(join(tmpdir(), "anx-secrets-"));
			const vaultPath = join(dir, "vault.json");
			const journalPath = resolveRotationJournalPath(vaultPath);
			const vault = new LocalFileSecretVault({ vaultPath });
			const rotation = new IdempotentSecretRotation(vault, { journalPath });

			const first = await vault.put("conn-1", "workload-a", "secret-v1");
			expect(first.version).toBe(1);

			const resolved = await vault.resolve(first);
			expect(resolved.plaintext).toBe("secret-v1");

			const rotated = await rotation.rotate(
				"conn-1",
				"workload-a",
				"rotation-001",
				"secret-v2",
			);
			expect(rotated.newVersion).toBe(2);

			const replay = await rotation.rotate(
				"conn-1",
				"workload-a",
				"rotation-001",
				"secret-v2",
			);
			expect(replay).toEqual(rotated);

			await rm(dir, { recursive: true, force: true });
		});
	});

	test("persists rotation idempotency across process restarts", async () => {
		await withEnv({ NODE_ENV: "test" }, async () => {
			const dir = await mkdtemp(join(tmpdir(), "anx-secrets-"));
			const vaultPath = join(dir, "vault.json");
			const journalPath = resolveRotationJournalPath(vaultPath);
			const vault = new LocalFileSecretVault({ vaultPath });
			const firstRotation = new IdempotentSecretRotation(vault, {
				journalPath,
			});

			await vault.put("conn-1", "workload-a", "secret-v1");
			const rotated = await firstRotation.rotate(
				"conn-1",
				"workload-a",
				"rotation-restart",
				"secret-v2",
			);

			const restartedRotation = new IdempotentSecretRotation(vault, {
				journalPath,
			});
			const replay = await restartedRotation.rotate(
				"conn-1",
				"workload-a",
				"rotation-restart",
				"secret-v2",
			);
			expect(replay).toEqual(rotated);

			const journalRaw = await readFile(journalPath, "utf8");
			const journal = JSON.parse(journalRaw) as {
				rotations: Record<string, { newVersion: number }>;
			};
			expect(Object.keys(journal.rotations)).toHaveLength(1);
			expect(replay.newVersion).toBe(2);

			await rm(dir, { recursive: true, force: true });
		});
	});

	test("deduplicates concurrent rotations with the same rotationId", async () => {
		await withEnv({ NODE_ENV: "test" }, async () => {
			const dir = await mkdtemp(join(tmpdir(), "anx-secrets-"));
			const vaultPath = join(dir, "vault.json");
			const journalPath = resolveRotationJournalPath(vaultPath);
			const vault = new LocalFileSecretVault({ vaultPath });
			const rotation = new IdempotentSecretRotation(vault, { journalPath });

			await vault.put("conn-1", "workload-a", "secret-v1");

			const [first, second] = await Promise.all([
				rotation.rotate("conn-1", "workload-a", "rotation-race", "secret-v2"),
				rotation.rotate("conn-1", "workload-a", "rotation-race", "secret-v2"),
			]);

			expect(first).toEqual(second);
			expect(first.newVersion).toBe(2);

			const latest = await vault.resolve({
				secretId: "conn-1",
				workloadId: "workload-a",
				version: Number.MAX_SAFE_INTEGER,
			});
			expect(latest.reference.version).toBe(2);

			await rm(dir, { recursive: true, force: true });
		});
	});
});
