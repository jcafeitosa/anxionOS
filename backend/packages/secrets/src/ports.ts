/** Opaque handle — never embed plaintext in events, DTOs, prompts or graph. */
export interface SecretReference {
	secretId: string;
	version: number;
	workloadId: string;
}

export interface SecretMaterial {
	reference: SecretReference;
	plaintext: string;
}

export interface SecretVault {
	/** Resolve a secret for an authorized workload. */
	resolve(reference: SecretReference): Promise<SecretMaterial>;

	/** Store or update secret material; returns new version. */
	put(
		secretId: string,
		workloadId: string,
		plaintext: string,
	): Promise<SecretReference>;

	/** Revoke all versions for a secret within a workload scope. */
	revoke(secretId: string, workloadId: string): Promise<void>;
}

export interface SecretRotationResult {
	secretId: string;
	previousVersion: number;
	newVersion: number;
	rotatedAt: string;
	/** Idempotent replays return the same result for the same rotationId. */
	rotationId: string;
}

export interface SecretRotationPort {
	/**
	 * Rotate secret material idempotently by secretId + rotationId.
	 * Replays with the same rotationId must not create a new version.
	 */
	rotate(
		secretId: string,
		workloadId: string,
		rotationId: string,
		nextPlaintext: string,
	): Promise<SecretRotationResult>;
}
