import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { SecretMaterial, SecretReference, SecretVault } from "./ports";

const DEV_VAULT_BLOCKED_MESSAGE =
	"LocalFileSecretVault is dev-only and cannot run when NODE_ENV=production. Configure a production secrets provider (KMS/Vault).";

export class DevVaultNotAllowedError extends Error {
	constructor(context: string) {
		super(`${context}: ${DEV_VAULT_BLOCKED_MESSAGE}`);
		this.name = "DevVaultNotAllowedError";
	}
}

export function isProductionEnvironment(): boolean {
	return process.env.NODE_ENV === "production";
}

/** Fail-closed guard: dev vault adapters must never bootstrap in production. */
export function assertDevVaultAllowed(context: string): void {
	if (isProductionEnvironment()) {
		throw new DevVaultNotAllowedError(context);
	}
}

interface StoredSecretVersion {
	version: number;
	plaintext: string;
	updatedAt: string;
}

interface VaultFile {
	secrets: Record<string, Record<string, StoredSecretVersion[]>>;
}

export interface LocalFileVaultConfig {
	/** Absolute path to JSON vault file (dev-only; never commit). */
	vaultPath: string;
}

async function loadVault(path: string): Promise<VaultFile> {
	try {
		const raw = await readFile(path, "utf8");
		return JSON.parse(raw) as VaultFile;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { secrets: {} };
		}
		throw error;
	}
}

async function saveVault(path: string, vault: VaultFile): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(vault, null, 2), "utf8");
}

export class LocalFileSecretVault implements SecretVault {
	constructor(private readonly config: LocalFileVaultConfig) {
		assertDevVaultAllowed("LocalFileSecretVault");
	}

	async resolve(reference: SecretReference): Promise<SecretMaterial> {
		const vault = await loadVault(this.config.vaultPath);
		const versions =
			vault.secrets[reference.workloadId]?.[reference.secretId] ?? [];
		if (versions.length === 0) {
			throw new Error(`Secret not found: ${reference.secretId}`);
		}

		const match =
			reference.version === Number.MAX_SAFE_INTEGER
				? versions[versions.length - 1]
				: versions.find((entry) => entry.version === reference.version);

		if (!match) {
			throw new Error(
				`Secret version not found: ${reference.secretId}@${reference.version}`,
			);
		}

		return {
			reference: {
				secretId: reference.secretId,
				workloadId: reference.workloadId,
				version: match.version,
			},
			plaintext: match.plaintext,
		};
	}

	async put(
		secretId: string,
		workloadId: string,
		plaintext: string,
	): Promise<SecretReference> {
		const vault = await loadVault(this.config.vaultPath);
		const workloadSecrets = vault.secrets[workloadId] ?? {};
		const versions = workloadSecrets[secretId] ?? [];
		const nextVersion = (versions.at(-1)?.version ?? 0) + 1;
		const entry: StoredSecretVersion = {
			version: nextVersion,
			plaintext,
			updatedAt: new Date().toISOString(),
		};
		workloadSecrets[secretId] = [...versions, entry];
		vault.secrets[workloadId] = workloadSecrets;
		await saveVault(this.config.vaultPath, vault);

		return { secretId, workloadId, version: nextVersion };
	}

	async revoke(secretId: string, workloadId: string): Promise<void> {
		const vault = await loadVault(this.config.vaultPath);
		if (vault.secrets[workloadId]) {
			delete vault.secrets[workloadId][secretId];
		}
		await saveVault(this.config.vaultPath, vault);
	}
}

export function resolveLocalVaultPath(): string | null {
	const configured = process.env.SECRETS_LOCAL_VAULT_PATH;
	if (configured && configured.length > 0) {
		assertDevVaultAllowed("SECRETS_LOCAL_VAULT_PATH");
		return configured;
	}
	if (process.env.ENABLE_DEV_VAULT === "true") {
		assertDevVaultAllowed("ENABLE_DEV_VAULT");
		return join(process.cwd(), ".local", "secrets-vault.json");
	}
	return null;
}

export function createSecretVaultFromEnv(): SecretVault | null {
	const vaultPath = resolveLocalVaultPath();
	if (!vaultPath) {
		return null;
	}
	assertDevVaultAllowed("createSecretVaultFromEnv");
	return new LocalFileSecretVault({ vaultPath });
}

export function resolveRotationJournalPath(vaultPath: string): string {
	return `${vaultPath}.rotations.json`;
}
