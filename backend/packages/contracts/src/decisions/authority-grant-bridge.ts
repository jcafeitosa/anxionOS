import { z } from "zod";
import { grantStatusSchema } from "../governance/types";
import type {
	AuthorityReference,
	DecisionAggregateReferences,
} from "./decision-record";

/**
 * Read-only grant view supplied by the governance module owner.
 * Decisions validates against this shape but does not persist grant state.
 */
export const governanceGrantSnapshotSchema = z.object({
	grantId: z.string().uuid(),
	status: grantStatusSchema,
	authorityEpochAtIssue: z.number().int().nonnegative(),
	capability: z.string().min(1),
});

/** Minimal grant pointer derived from a governance AuthorityReference. */
export const authorityGrantRefSchema = z.object({
	grantId: z.string().uuid(),
	minimumEpochs: z.number().int().nonnegative(),
});

export type GovernanceGrantSnapshot = z.infer<
	typeof governanceGrantSnapshotSchema
>;
export type AuthorityGrantRef = z.infer<typeof authorityGrantRefSchema>;

export class AuthorityGrantBridgeError extends Error {
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = "AuthorityGrantBridgeError";
		this.code = code;
	}
}

export function parseGovernanceGrantSnapshot(
	input: unknown,
): GovernanceGrantSnapshot {
	return governanceGrantSnapshotSchema.parse(input);
}

/**
 * Maps a governance-kind AuthorityReference to a grant ref via aggregate references.
 * Agent/system authorities return null — no grant linkage.
 */
export function mapAuthorityReferenceToGrantRef(
	authority: AuthorityReference,
	references: DecisionAggregateReferences,
): AuthorityGrantRef | null {
	if (authority.kind !== "governance") {
		return null;
	}
	const grantId = references.grantId;
	if (!grantId) {
		throw new AuthorityGrantBridgeError(
			"DC_AUTHORITY_GRANT_ID_REQUIRED",
			"Governance authority requires references.grantId",
		);
	}
	return authorityGrantRefSchema.parse({
		grantId,
		minimumEpochs: authority.minimumEpochs,
	});
}

/**
 * Validates authority against a governance-owned grant snapshot and current epoch.
 * Does not mutate or duplicate grant ownership.
 */
export function validateAuthorityAgainstGrantSnapshot(
	authority: AuthorityReference,
	snapshot: GovernanceGrantSnapshot,
	grantRef: AuthorityGrantRef,
	currentAuthorityEpoch: number,
): void {
	if (authority.kind !== "governance") {
		return;
	}
	if (snapshot.grantId !== grantRef.grantId) {
		throw new AuthorityGrantBridgeError(
			"DC_GRANT_ID_MISMATCH",
			"Grant snapshot does not match authority grant reference",
		);
	}
	if (snapshot.status !== "active") {
		throw new AuthorityGrantBridgeError(
			"DC_GRANT_NOT_ACTIVE",
			`Grant ${snapshot.grantId} is ${snapshot.status}`,
		);
	}
	if (currentAuthorityEpoch < authority.minimumEpochs) {
		throw new AuthorityGrantBridgeError(
			"DC_AUTHORITY_EPOCH_INSUFFICIENT",
			`Current epoch ${currentAuthorityEpoch} is below required ${authority.minimumEpochs}`,
		);
	}
	if (snapshot.authorityEpochAtIssue > currentAuthorityEpoch) {
		throw new AuthorityGrantBridgeError(
			"DC_GRANT_EPOCH_FUTURE",
			"Grant authorityEpochAtIssue exceeds current epoch",
		);
	}
}
