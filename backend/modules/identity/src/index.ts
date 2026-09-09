export type {
	Principal,
	PrincipalStatus,
	NewPrincipal,
} from "./domain/entities/principal";
export type { PrincipalRepository } from "./domain/ports/principal-repository";
export {
	registerPrincipal,
	type RegisterPrincipalInput,
	type RegisterPrincipalDeps,
} from "./application/commands/register-principal";
export {
	suspendPrincipal,
	type SuspendPrincipalInput,
	type SuspendPrincipalDeps,
} from "./application/commands/suspend-principal";
export {
	syncPrincipalEmail,
	type SyncPrincipalEmailInput,
	type SyncPrincipalEmailDeps,
} from "./application/commands/sync-principal-email";
export {
	getPrincipalById,
	getPrincipalByAuthUserId,
} from "./application/queries/get-principal";
export { createIdentityDb } from "./infrastructure/create-db";
export { createPrincipalCommandsService } from "./infrastructure/persistence/principal-command-service";
export { ensureIdentitySchema } from "./infrastructure/migrate";
export { principals } from "./infrastructure/persistence/schema";
