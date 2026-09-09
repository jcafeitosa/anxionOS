export type {
	SecretMaterial,
	SecretReference,
	SecretRotationPort,
	SecretRotationResult,
	SecretVault,
} from "./ports";
export {
	assertNoPlaintextSecrets,
	redactString,
	redactValue,
} from "./redaction";
export { IdempotentSecretRotation } from "./rotation";
export type { IdempotentRotationOptions } from "./rotation";
export {
	assertDevVaultAllowed,
	createSecretVaultFromEnv,
	DevVaultNotAllowedError,
	isProductionEnvironment,
	LocalFileSecretVault,
	resolveLocalVaultPath,
	resolveRotationJournalPath,
} from "./local-vault";
