import { describe, expect, test } from "bun:test";
import type {
	AuthorityReference,
	DecisionAggregateReferences,
} from "@anxionos/contracts/decisions";
import {
	AuthorityGrantBridgeError,
	type GovernanceGrantSnapshot,
	mapAuthorityReferenceToGrantRef,
	validateAuthorityAgainstGrantSnapshot,
} from "@anxionos/contracts/decisions";

const GRANT_ID = "a1234567-89ab-4def-8123-456789abcdef";
const references: DecisionAggregateReferences = {
	decisionId: "dc_dec_123e4567-e89b-12d3-a456-426614174000",
	proposalId: "dc_prp_123e4567-e89b-12d3-a456-426614174000",
	grantId: GRANT_ID,
};

const governanceAuthority: AuthorityReference = {
	id: "b1234567-89ab-4def-8123-456789abcdef",
	kind: "governance",
	minimumEpochs: 2,
	grantedBy: "CTO",
	grantedAt: "2026-09-01T00:00:00.000Z",
};

const activeSnapshot: GovernanceGrantSnapshot = {
	grantId: GRANT_ID,
	status: "active",
	authorityEpochAtIssue: 1,
	capability: "decisions.propose",
};

describe("AuthorityReference → Grant bridge", () => {
	test("mapAuthorityReferenceToGrantRef returns null for agent kind", () => {
		const agentAuthority: AuthorityReference = {
			...governanceAuthority,
			kind: "agent",
		};
		expect(
			mapAuthorityReferenceToGrantRef(agentAuthority, references),
		).toBeNull();
	});

	test("mapAuthorityReferenceToGrantRef throws when governance lacks grantId", () => {
		const refsWithoutGrant: DecisionAggregateReferences = {
			decisionId: references.decisionId,
			proposalId: references.proposalId,
		};
		expect(() =>
			mapAuthorityReferenceToGrantRef(governanceAuthority, refsWithoutGrant),
		).toThrow(AuthorityGrantBridgeError);
	});

	test("mapAuthorityReferenceToGrantRef maps governance authority to grant ref", () => {
		const ref = mapAuthorityReferenceToGrantRef(
			governanceAuthority,
			references,
		);
		expect(ref).toEqual({ grantId: GRANT_ID, minimumEpochs: 2 });
	});

	test("validateAuthorityAgainstGrantSnapshot rejects non-active grant", () => {
		const grantRef = mapAuthorityReferenceToGrantRef(
			governanceAuthority,
			references,
		)!;
		const revokedSnapshot: GovernanceGrantSnapshot = {
			...activeSnapshot,
			status: "revoked",
		};
		expect(() =>
			validateAuthorityAgainstGrantSnapshot(
				governanceAuthority,
				revokedSnapshot,
				grantRef,
				3,
			),
		).toThrow(AuthorityGrantBridgeError);
	});

	test("validateAuthorityAgainstGrantSnapshot rejects insufficient epoch", () => {
		const grantRef = mapAuthorityReferenceToGrantRef(
			governanceAuthority,
			references,
		)!;
		expect(() =>
			validateAuthorityAgainstGrantSnapshot(
				governanceAuthority,
				activeSnapshot,
				grantRef,
				1,
			),
		).toThrow(AuthorityGrantBridgeError);
	});

	test("validateAuthorityAgainstGrantSnapshot passes valid governance authority", () => {
		const grantRef = mapAuthorityReferenceToGrantRef(
			governanceAuthority,
			references,
		)!;
		expect(() =>
			validateAuthorityAgainstGrantSnapshot(
				governanceAuthority,
				activeSnapshot,
				grantRef,
				3,
			),
		).not.toThrow();
	});

	test("validateAuthorityAgainstGrantSnapshot rejects future grant epoch", () => {
		const grantRef = mapAuthorityReferenceToGrantRef(
			governanceAuthority,
			references,
		)!;
		const futureSnapshot: GovernanceGrantSnapshot = {
			...activeSnapshot,
			authorityEpochAtIssue: 5,
		};
		let caught: AuthorityGrantBridgeError | undefined;
		try {
			validateAuthorityAgainstGrantSnapshot(
				governanceAuthority,
				futureSnapshot,
				grantRef,
				3,
			);
		} catch (err) {
			caught = err as AuthorityGrantBridgeError;
		}
		expect(caught).toBeInstanceOf(AuthorityGrantBridgeError);
		expect(caught?.code).toBe("DC_GRANT_EPOCH_FUTURE");
	});

	test("validateAuthorityAgainstGrantSnapshot rejects grant id mismatch", () => {
		const grantRef = mapAuthorityReferenceToGrantRef(
			governanceAuthority,
			references,
		)!;
		const mismatchedSnapshot: GovernanceGrantSnapshot = {
			...activeSnapshot,
			grantId: "c1234567-89ab-4def-8123-456789abcdef",
		};
		expect(() =>
			validateAuthorityAgainstGrantSnapshot(
				governanceAuthority,
				mismatchedSnapshot,
				grantRef,
				3,
			),
		).toThrow(AuthorityGrantBridgeError);
	});
});
