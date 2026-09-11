export {
	type IssueServiceCredentialDeps,
	type IssueServiceCredentialInput,
	type IssueServiceCredentialResult,
	issueServiceCredential,
} from "./application/commands/issue-service-credential";
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
	type RecordSessionRevokedDeps,
	type RecordSessionRevokedInput,
	type RecordSessionRevokedResult,
	recordSessionRevoked,
} from "./application/commands/record-session-revoked";
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
	type RevokePrincipalDeps,
	type RevokePrincipalInput,
	revokePrincipal,
} from "./application/commands/revoke-principal";
export {
	type RevokeServiceCredentialDeps,
	type RevokeServiceCredentialInput,
	revokeServiceCredential,
} from "./application/commands/revoke-service-credential";
export {
	type RevokeServiceIdentityDeps,
	revokeServiceIdentity,
} from "./application/commands/revoke-service-identity";
export {
	type RotateServiceCredentialDeps,
	type RotateServiceCredentialInput,
	type RotateServiceCredentialResult,
	rotateServiceCredential,
} from "./application/commands/rotate-service-credential";
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
	IdentityCommandError,
	isUniqueViolation,
	throwIdentityError,
} from "./application/errors";
export {
	toPrincipalDto,
	toServiceCredentialDto,
	toSessionRefDto,
} from "./application/presenters";
export {
	getPrincipalByAuthUserId,
	getPrincipalById,
} from "./application/queries/get-principal";
export { listServiceCredentials } from "./application/queries/list-service-credentials";
export {
	listRevokedSessions,
	listSessions,
} from "./application/queries/list-sessions";
export {
	type ServiceCredentialVerification,
	type VerifyServiceCredentialDeps,
	verifyServiceCredential,
} from "./application/queries/verify-service-credential";
export type {
	NewPrincipal,
	Principal,
	PrincipalKind,
	PrincipalStatus,
} from "./domain/entities/principal";
export type {
	NewServiceCredential,
	ServiceCredential,
	ServiceCredentialStatus,
} from "./domain/entities/service-credential";
export type {
	NewServiceIdentity,
	ServiceIdentity,
	ServiceIdentityStatus,
} from "./domain/entities/service-identity";
export type {
	NewSessionRef,
	SessionRef,
	SessionRefStatus,
} from "./domain/entities/session-ref";
export {
	canTransition,
	revisionMatches,
} from "./domain/policies/principal-lifecycle";
export type {
	CommandJournalRecord,
	CommandJournalRepository,
	NewCommandJournalRecord,
} from "./domain/ports/command-journal";
export type {
	IdentityTransactionContext,
	IdentityUnitOfWork,
} from "./domain/ports/identity-unit-of-work";
export type {
	PrincipalLookup,
	PrincipalLookupResult,
} from "./domain/ports/principal-lookup";
export type { PrincipalRepository } from "./domain/ports/principal-repository";
export type {
	GeneratedServiceCredential,
	ServiceCredentialCrypto,
} from "./domain/ports/service-credential-crypto";
export type { ServiceCredentialRepository } from "./domain/ports/service-credential-repository";
export type { ServiceIdentityRepository } from "./domain/ports/service-identity-repository";
export type { SessionRefRepository } from "./domain/ports/session-ref-repository";
export type {
	RevokedSessionRef,
	SessionRevocationPort,
	SessionRevoker,
} from "./domain/ports/session-revoker";
export { SessionRevocationUnavailableError } from "./domain/ports/session-revoker";
export { hashSessionRef } from "./infrastructure/adapters/credential-crypto";
export { createPgPrincipalLookup } from "./infrastructure/adapters/principal-lookup";
export { createServiceCredentialCrypto } from "./infrastructure/adapters/service-credential-crypto";
export { createIdentityDb } from "./infrastructure/create-db";
export { createIdentityUnitOfWork } from "./infrastructure/identity-unit-of-work";
export { ensureIdentitySchema } from "./infrastructure/migrate";
export {
	commandJournal,
	principals,
	serviceCredentials,
	serviceIdentities,
	sessionRefs,
} from "./infrastructure/persistence/schema";
