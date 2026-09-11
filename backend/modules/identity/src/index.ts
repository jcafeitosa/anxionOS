export {
	type LinkAuthUserIdDeps,
	type LinkAuthUserIdInput,
	linkAuthUserId,
} from "./application/commands/link-auth-user-id";
export {
	type ReactivatePrincipalDeps,
	type ReactivatePrincipalInput,
	reactivatePrincipal,
} from "./application/commands/reactivate-principal";
export {
	type RegisterPrincipalDeps,
	type RegisterPrincipalInput,
	registerPrincipal,
} from "./application/commands/register-principal";
export {
	type RegisterServiceIdentityDeps,
	registerServiceIdentity,
} from "./application/commands/register-service-identity";
export {
	type RevokeServiceIdentityDeps,
	revokeServiceIdentity,
} from "./application/commands/revoke-service-identity";
export {
	type SuspendPrincipalDeps,
	type SuspendPrincipalInput,
	suspendPrincipal,
} from "./application/commands/suspend-principal";
export {
	type SyncPrincipalEmailDeps,
	type SyncPrincipalEmailInput,
	syncPrincipalEmail,
} from "./application/commands/sync-principal-email";
export {
	type HandlePrincipalSuspendedDeps,
	handlePrincipalSuspended,
} from "./application/consumers/handle-principal-suspended";
export {
	type ReconcileSuspendedPrincipalSessionsResult,
	reconcileSuspendedPrincipalSessions,
} from "./application/consumers/reconcile-suspended-principal-sessions";
export {
	getPrincipalByAuthUserId,
	getPrincipalById,
} from "./application/queries/get-principal";
export type {
	NewPrincipal,
	Principal,
	PrincipalStatus,
} from "./domain/entities/principal";
export type {
	NewServiceIdentity,
	ServiceIdentity,
	ServiceIdentityStatus,
} from "./domain/entities/service-identity";
export type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "./domain/ports/identity-unit-of-work";
export type { PrincipalRepository } from "./domain/ports/principal-repository";
export type { ServiceIdentityRepository } from "./domain/ports/service-identity-repository";
export type { SessionRevoker } from "./domain/ports/session-revoker";
export { SessionRevocationUnavailableError } from "./domain/ports/session-revoker";
export { createIdentityDb } from "./infrastructure/create-db";
export { createIdentityUnitOfWork } from "./infrastructure/identity-unit-of-work";
export { ensureIdentitySchema } from "./infrastructure/migrate";
export {
	principals,
	serviceIdentities,
} from "./infrastructure/persistence/schema";
