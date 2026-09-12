import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { issueGrant } from "@anxionos/governance";
import { PrincipalLookupUnavailableError as OrganizationPrincipalLookupUnavailableError } from "@anxionos/organizations";
import { mapGovernanceError } from "../../apps/api/src/governance/error-handler";
import { activateBreakGlass } from "../../modules/governance/src/application/commands/activate-break-glass";
import { createDelegation } from "../../modules/governance/src/application/commands/create-delegation";
import { submitChangeProposal } from "../../modules/governance/src/application/commands/submit-change-proposal";
import type { Grant } from "../../modules/governance/src/domain/entities/grant";
import type { PrincipalLookup } from "../../modules/governance/src/domain/ports/principal-lookup";
import { PrincipalLookupUnavailableError as GovernancePrincipalLookupUnavailableError } from "../../modules/governance/src/domain/ports/principal-lookup";
import {
	createInMemoryApprovalRepository,
	createInMemoryAuthorityEpochStore,
	createInMemoryChangeProposalRepository,
	createInMemoryCommandJournalRepository,
	createInMemoryGrantRepository,
	createRecordingGovernanceUnitOfWork,
} from "./test-support";

/**
 * ANX-477 (rodada 2) — contrato de erro do caminho de identidade.
 *
 * O teste da rodada 1 lancava `PrincipalLookupUnavailableError` do PORT DO
 * GOVERNANCE. Em producao quem lanca e' o adapter de identidade de
 * `@anxionos/organizations` (`identity-principal-lookup.ts`), e o boundary de
 * governance reconhece ESSA classe (`apps/api/src/governance/error-handler.ts`).
 * A classe errada cai no ramo generico e vira 500; a real vira
 * `GOV_PRINCIPAL_NOT_FOUND` / 404. Este arquivo usa a classe REAL, como a
 * producao, e pina o status devolvido hoje.
 *
 * Vive em `tests/` (fora do projeto composite de `modules/governance`) de
 * proposito: e' o unico lugar que pode importar `@anxionos/organizations` e o
 * boundary de `apps/api` sem violar `rootDir`/`references` nem a regra de
 * dependencia `application-not-infra`.
 */

const SCOPE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRINCIPAL_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_GRANT_ID = "22222222-2222-4222-8222-222222222222";
const CAPABILITY = "owner.manage";

function unavailableLookup(): PrincipalLookup {
	return {
		async exists() {
			throw new OrganizationPrincipalLookupUnavailableError(
				"identity service unavailable",
			);
		},
	};
}

function buildParentGrant(): Grant {
	const now = new Date("2026-09-12T00:00:00.000Z");
	return {
		id: PARENT_GRANT_ID,
		tenantId: SCOPE_ID,
		agencyId: SCOPE_ID,
		scopeId: SCOPE_ID,
		scopeKind: "agency",
		granteePrincipalId: PRINCIPAL_ID,
		granteeAgentId: null,
		issuedByPrincipalId: null,
		capability: CAPABILITY,
		resourceRef: null,
		status: "active",
		validFrom: now,
		validUntil: null,
		derivedFromMembershipId: null,
		authorityEpochAtIssue: 0,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

function createDeps(seed: Grant[] = []) {
	const grantRepository = createInMemoryGrantRepository(seed);
	const commandJournal = createInMemoryCommandJournalRepository();
	const { unitOfWork } = createRecordingGovernanceUnitOfWork({
		grantRepository,
		changeProposalRepository: createInMemoryChangeProposalRepository(),
		approvalRepository: createInMemoryApprovalRepository(),
		authorityEpochStore: createInMemoryAuthorityEpochStore(),
		commandJournal,
	});
	return {
		deps: {
			unitOfWork,
			commandJournal,
			grantRepository,
			principalLookup: unavailableLookup(),
		},
		commandJournal,
	};
}

describe("ANX-477 — identidade indisponivel: comando novo propaga a classe REAL", () => {
	test("issueGrant", async () => {
		const { deps, commandJournal } = createDeps();
		const commandId = randomUUID();
		const pending = issueGrant(deps, {
			commandId,
			scopeId: SCOPE_ID,
			issuedByPrincipalId: null,
			granteePrincipalId: PRINCIPAL_ID,
			capability: CAPABILITY,
		});
		await expect(pending).rejects.toBeInstanceOf(
			OrganizationPrincipalLookupUnavailableError,
		);
		expect(await commandJournal.findByCommandId(commandId)).toBeNull();
	});

	test("submitChangeProposal", async () => {
		const { deps, commandJournal } = createDeps();
		const commandId = randomUUID();
		const pending = submitChangeProposal(deps, {
			commandId,
			scopeId: SCOPE_ID,
			kind: "SOFTWARE",
			payloadHash: "payload-hash",
			proposerPrincipalId: PRINCIPAL_ID,
		});
		await expect(pending).rejects.toBeInstanceOf(
			OrganizationPrincipalLookupUnavailableError,
		);
		expect(await commandJournal.findByCommandId(commandId)).toBeNull();
	});

	test("activateBreakGlass", async () => {
		const { deps, commandJournal } = createDeps();
		const commandId = randomUUID();
		const pending = activateBreakGlass(deps, {
			commandId,
			scopeId: SCOPE_ID,
			granteePrincipalId: PRINCIPAL_ID,
			capability: CAPABILITY,
			reason: "incident drill",
			expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});
		await expect(pending).rejects.toBeInstanceOf(
			OrganizationPrincipalLookupUnavailableError,
		);
		expect(await commandJournal.findByCommandId(commandId)).toBeNull();
	});

	test("createDelegation", async () => {
		const { deps, commandJournal } = createDeps([buildParentGrant()]);
		const commandId = randomUUID();
		const pending = createDelegation(deps, {
			commandId,
			parentGrantId: PARENT_GRANT_ID,
			delegatePrincipalId: PRINCIPAL_ID,
			capabilitySubset: [CAPABILITY],
			validUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
		});
		await expect(pending).rejects.toBeInstanceOf(
			OrganizationPrincipalLookupUnavailableError,
		);
		expect(await commandJournal.findByCommandId(commandId)).toBeNull();
	});
});

describe("ANX-477 — boundary de governance: status da identidade indisponivel", () => {
	test("classe REAL (organizations) -> 404 GOV_PRINCIPAL_NOT_FOUND", () => {
		const mapped = mapGovernanceError(
			new OrganizationPrincipalLookupUnavailableError("identity down"),
		);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.code).toBe("NOT_FOUND");
		expect(mapped.body.error.details).toMatchObject({
			code: "GOV_PRINCIPAL_NOT_FOUND",
		});
	});

	test("classe do port do governance NAO e' a de producao (cai em 500)", () => {
		// Contraste que documenta o defeito da rodada 1: o boundary reconhece a
		// classe de `@anxionos/organizations`, nao a duplicata do port.
		const mapped = mapGovernanceError(
			new GovernancePrincipalLookupUnavailableError("identity down"),
		);
		expect(mapped.status).toBe(500);
	});
});
