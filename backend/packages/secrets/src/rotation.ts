import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type {
	SecretRotationPort,
	SecretRotationResult,
	SecretVault,
} from "./ports";

interface RotationRecord {
	secretId: string;
	workloadId: string;
	rotationId: string;
	previousVersion: number;
	newVersion: number;
	rotatedAt: string;
}

interface RotationJournalFile {
	rotations: Record<string, RotationRecord>;
}

export interface IdempotentRotationOptions {
	/**
	 * Persistent journal path for rotation idempotency across process restarts.
	 * Required for dev vault durability; production KMS/HSM adapters own rotation
	 * state externally (see ANX-161).
	 */
	journalPath?: string;
}

async function loadJournal(path: string): Promise<RotationJournalFile> {
	try {
		const raw = await readFile(path, "utf8");
		return JSON.parse(raw) as RotationJournalFile;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			return { rotations: {} };
		}
		throw error;
	}
}

async function saveJournal(
	path: string,
	journal: RotationJournalFile,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(journal, null, 2), "utf8");
}

async function readJournalRecord(
	journalPath: string,
	key: string,
): Promise<RotationRecord | undefined> {
	const journal = await loadJournal(journalPath);
	return journal.rotations[key];
}

async function writeJournalRecord(
	journalPath: string,
	key: string,
	record: RotationRecord,
): Promise<RotationRecord> {
	const journal = await loadJournal(journalPath);
	const existing = journal.rotations[key];
	if (existing) {
		return existing;
	}
	journal.rotations[key] = record;
	await saveJournal(journalPath, journal);
	return record;
}

function toResult(record: RotationRecord): SecretRotationResult {
	return {
		secretId: record.secretId,
		previousVersion: record.previousVersion,
		newVersion: record.newVersion,
		rotatedAt: record.rotatedAt,
		rotationId: record.rotationId,
	};
}

export class IdempotentSecretRotation implements SecretRotationPort {
	private readonly rotations = new Map<string, RotationRecord>();
	private readonly pending = new Map<string, Promise<SecretRotationResult>>();
	private readonly journalPath?: string;

	constructor(
		private readonly vault: SecretVault,
		options?: IdempotentRotationOptions,
	) {
		this.journalPath = options?.journalPath;
	}

	async rotate(
		secretId: string,
		workloadId: string,
		rotationId: string,
		nextPlaintext: string,
	): Promise<SecretRotationResult> {
		const key = `${workloadId}:${secretId}:${rotationId}`;
		const inFlight = this.pending.get(key);
		if (inFlight) {
			return inFlight;
		}

		const operation = this.executeRotation(
			key,
			secretId,
			workloadId,
			rotationId,
			nextPlaintext,
		);
		this.pending.set(key, operation);
		try {
			return await operation;
		} finally {
			this.pending.delete(key);
		}
	}

	private async executeRotation(
		key: string,
		secretId: string,
		workloadId: string,
		rotationId: string,
		nextPlaintext: string,
	): Promise<SecretRotationResult> {
		const cached = this.rotations.get(key);
		if (cached) {
			return toResult(cached);
		}

		if (this.journalPath) {
			const persisted = await readJournalRecord(this.journalPath, key);
			if (persisted) {
				this.rotations.set(key, persisted);
				return toResult(persisted);
			}
		}

		const current = await this.vault
			.resolve({
				secretId,
				workloadId,
				version: Number.MAX_SAFE_INTEGER,
			})
			.catch(() => null);

		const previousVersion = current?.reference.version ?? 0;
		const reference = await this.vault.put(secretId, workloadId, nextPlaintext);

		const record: RotationRecord = {
			secretId,
			workloadId,
			rotationId,
			previousVersion,
			newVersion: reference.version,
			rotatedAt: new Date().toISOString(),
		};

		const stored = this.journalPath
			? await writeJournalRecord(this.journalPath, key, record)
			: record;
		this.rotations.set(key, stored);

		return toResult(stored);
	}
}
