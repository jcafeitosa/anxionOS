export type {
	Principal,
	PrincipalStatus,
	NewPrincipal,
} from "./domain/entities/principal";
export type {
	ServiceIdentity,
	ServiceIdentityStatus,
	NewServiceIdentity,
} from "./domain/entities/service-identity";
export type { PrincipalRepository } from "./domain/ports/principal-repository";
export type {
	IdentityUnitOfWork,
	IdentityTransactionContext,
} from "./domain/ports/identity-unit-of-work";
export type { ServiceIdentityRepository } from "./domain/ports/service-identity-repository";
export type { SessionRevoker } from "./domain/ports/session-revoker";
export { SessionRevocationUnavailableError } from "./domain/ports/session-revoker";
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
	reactivatePrincipal,
	type ReactivatePrincipalInput,
	type ReactivatePrincipalDeps,
} from "./application/commands/reactivate-principal";
export {
	syncPrincipalEmail,
	type SyncPrincipalEmailInput,
	type SyncPrincipalEmailDeps,
} from "./application/commands/sync-principal-email";
export {
	registerServiceIdentity,
	type RegisterServiceIdentityDeps,
} from "./application/commands/register-service-identity";
export {
	revokeServiceIdentity,
	type RevokeServiceIdentityDeps,
} from "./application/commands/revoke-service-identity";
export {
	handlePrincipalSuspended,
	type HandlePrincipalSuspendedDeps,
} from "./application/consumers/handle-principal-suspended";
export {
	getPrincipalById,
	getPrincipalByAuthUserId,
} from "./application/queries/get-principal";
export { createIdentityDb } from "./infrastructure/create-db";
export { createIdentityUnitOfWork } from "./infrastructure/identity-unit-of-work";
export { ensureIdentitySchema } from "./infrastructure/migrate";
export { principals, serviceIdentities } from "./infrastructure/persistence/schema";
