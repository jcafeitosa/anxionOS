export {
	assertDevVaultAllowed,
	createSecretVaultFromEnv,
	DevVaultNotAllowedError,
	isProductionEnvironment,
	LocalFileSecretVault,
	resolveLocalVaultPath,
	resolveRotationJournalPath,
} from "./local-vault";
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
export type { IdempotentRotationOptions } from "./rotation";
export { IdempotentSecretRotation } from "./rotation";
