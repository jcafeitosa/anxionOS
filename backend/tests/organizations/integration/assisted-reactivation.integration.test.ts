import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	acceptInviteByToken,
	activateMembership,
	createAgency,
	createHmacInviteTokenHasher,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
	inviteMember,
	OrganizationCommandError,
	revokeMembership,
} from "@anxionos/organizations";
import { MEMBERSHIP_CONFLICT_CONSTRAINTS } from "../../../modules/organizations/src/domain/errors/membership-errors";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	withOrganizationsPgHarness,
} from "../test-support";

/**
 * F-01/F-02 do G5 (ANX-460) contra PostgreSQL real.
 *
 * A transicao `revoked -> active` (D-ORG-046) introduziu duas colisoes com os
 * indices parciais de `organizations_memberships` que o repositorio in-memory
 * NAO modela — e por isso os testes de unidade davam falso PASS:
 *
 *  - F-01: revogar um membro, reconvida-lo (novo vinculo ativo) e reativar o
 *    vinculo antigo viola `..._agency_principal_active_uidx` → o `23505` cru
 *    subia como **500**;
 *  - F-02: reativar uma membership `role=owner` viola
 *    `..._one_owner_active_uidx` → **500** (e o teste de unidade afirmava 200).
 *
 * Estes testes exercitam o PostgreSQL de verdade: o indice e' quem decide.
 */
const PEPPER = "organizations-assisted-reactivation-pepper";

describe("reativacao assistida contra PostgreSQL real (F-01/F-02)", () => {
	test("F-01: reativar vinculo antigo quando o principal ja' tem outro ativo e' 409, nunca 500", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const memberPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const inviteTokenHasher = createHmacInviteTokenHasher(PEPPER);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([
					ownerPrincipalId,
					memberPrincipalId,
				]),
			};
			const memberEmail = "member-reactivation@example.com";

			const agency = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Reactivation Agency",
				marketScope: "both",
				ownerPrincipalId,
			});

			// Passo 1-2: convida o membro e ele aceita → M1 ativa.
			const firstInvite = await inviteMember(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					email: memberEmail,
					role: "operator",
					actorPrincipalId: ownerPrincipalId,
				},
			);
			await acceptInviteByToken(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					token: firstInvite.inviteToken,
					sessionPrincipalId: memberPrincipalId,
					sessionEmail: memberEmail,
				},
			);
			const m1 = firstInvite.result.aggregateId;

			// Passo 3: owner revoga M1.
			await revokeMembership(deps, {
				commandId: randomUUID(),
				agencyId: agency.aggregateId,
				membershipId: m1,
				actorPrincipalId: ownerPrincipalId,
			});

			// Passo 4: owner reconvida o MESMO e-mail e o membro aceita → M2 ativa
			// (o principal volta a ter vinculo ativo, agora numa segunda linha).
			const secondInvite = await inviteMember(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					email: memberEmail,
					role: "operator",
					actorPrincipalId: ownerPrincipalId,
				},
			);
			expect(secondInvite.result.aggregateId).not.toBe(m1);
			await acceptInviteByToken(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					token: secondInvite.inviteToken,
					sessionPrincipalId: memberPrincipalId,
					sessionEmail: memberEmail,
				},
			);

			// Passo 5: reativar o vinculo ANTIGO colide com
			// `organizations_memberships_agency_principal_active_uidx`. Antes: 500
			// com o erro cru do driver. Agora: 409 institucional.
			let caught: unknown;
			try {
				await activateMembership(deps, {
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					membershipId: m1,
					actorPrincipalId: ownerPrincipalId,
					targetPrincipalId: memberPrincipalId,
				});
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(OrganizationCommandError);
			expect((caught as OrganizationCommandError).organizationCode).toBe(
				"ORG_MEMBERSHIP_EXISTS",
			);
			expect((caught as OrganizationCommandError).statusCode).toBe(409);

			// M1 continua revogada: a transacao foi revertida por inteiro.
			const row = await pool.query<{ status: string }>(
				"SELECT status FROM organizations_memberships WHERE id = $1",
				[m1],
			);
			expect(row.rows[0]?.status).toBe("revoked");
			// E existe exatamente UM vinculo ativo do membro.
			const active = await pool.query<{ count: number }>(
				`SELECT count(*)::int AS count FROM organizations_memberships
				 WHERE agency_id = $1 AND principal_id = $2 AND status = 'active'`,
				[agency.aggregateId, memberPrincipalId],
			);
			expect(active.rows[0]?.count).toBe(1);
		});
	});

	test("F-01 (variante ANX-482): aceitar convite quando ja' existe vinculo ativo e' 409, nunca 500", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const inviteTokenHasher = createHmacInviteTokenHasher(PEPPER);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
			};
			const ownerEmail = "owner-self-invite@example.com";

			const agency = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Self Invite Agency",
				marketScope: "both",
				ownerPrincipalId,
			});

			// O owner convida o PROPRIO e-mail e aceita: ele ja' tem vinculo ativo
			// (o de owner), entao o aceite colide com o indice parcial.
			const invite = await inviteMember(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					email: ownerEmail,
					role: "operator",
					actorPrincipalId: ownerPrincipalId,
				},
			);

			let caught: unknown;
			try {
				await acceptInviteByToken(
					{
						...deps,
						inviteTokenHasher,
						membershipRepository: orgDb.membershipRepository,
					},
					{
						commandId: randomUUID(),
						token: invite.inviteToken,
						sessionPrincipalId: ownerPrincipalId,
						sessionEmail: ownerEmail,
					},
				);
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(OrganizationCommandError);
			expect((caught as OrganizationCommandError).organizationCode).toBe(
				"ORG_MEMBERSHIP_EXISTS",
			);
			expect((caught as OrganizationCommandError).statusCode).toBe(409);

			const ownerMemberships = await pool.query<{ count: number }>(
				`SELECT count(*)::int AS count FROM organizations_memberships
				 WHERE agency_id = $1 AND principal_id = $2 AND status = 'active'`,
				[agency.aggregateId, ownerPrincipalId],
			);
			expect(ownerMemberships.rows[0]?.count).toBe(1);
		});
	});

	test("F-02: reativar membership de owner e' recusado com 409 e NAO quebra o indice de owner unico", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const adminPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([
					ownerPrincipalId,
					adminPrincipalId,
				]),
			};

			const agency = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Owner Reactivation Agency",
				marketScope: "both",
				ownerPrincipalId,
			});

			// O ator tem de ser OUTRO membro ativo com papel owner/admin: revogar a
			// membership do proprio owner tira dele a autoridade, entao semear um
			// admin separado e' o unico jeito de chegar ao gate.
			await pool.query(
				`INSERT INTO organizations_memberships
				   (id, tenant_id, agency_id, principal_id, role, status,
				    joined_at, revision, created_at, updated_at)
				 VALUES ($1, $2, $2, $3, 'admin', 'active', now(), 1, now(), now())`,
				[randomUUID(), agency.aggregateId, adminPrincipalId],
			);

			// "owner revogado" e' inalcancavel pela API (nenhum dos 4 escritores de
			// membership produz esse estado; o fuzz de 540 comandos dos gates tambem
			// nao produziu): semeia direto para provar que a recusa e' de DOMINIO
			// (409) e nao um 23505 cru (500).
			const ownerMembership = await pool.query<{ id: string }>(
				`SELECT id FROM organizations_memberships
				 WHERE agency_id = $1 AND role = 'owner'`,
				[agency.aggregateId],
			);
			const ownerMembershipId = ownerMembership.rows[0]?.id;
			expect(ownerMembershipId).toBeDefined();
			await pool.query(
				`UPDATE organizations_memberships SET status = 'revoked', revoked_at = now()
				 WHERE id = $1`,
				[ownerMembershipId],
			);

			let caught: unknown;
			try {
				await activateMembership(deps, {
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					membershipId: ownerMembershipId,
					actorPrincipalId: adminPrincipalId,
					targetPrincipalId: ownerPrincipalId,
				});
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(OrganizationCommandError);
			expect((caught as OrganizationCommandError).organizationCode).toBe(
				"ORG_INVALID_STATUS_TRANSITION",
			);
			expect((caught as OrganizationCommandError).statusCode).toBe(409);

			const row = await pool.query<{ status: string }>(
				"SELECT status FROM organizations_memberships WHERE id = $1",
				[ownerMembershipId],
			);
			expect(row.rows[0]?.status).toBe("revoked");
		});
	});

	test("G2-MEDIUM: aceite de convite role=owner e' recusado com 409 (guarda sem oraculo antes)", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const inviteTokenHasher = createHmacInviteTokenHasher(PEPPER);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				inviteTokenHasher,
				membershipRepository: orgDb.membershipRepository,
			};
			const agency = await createAgency(
				{ ...deps },
				{
					commandId: randomUUID(),
					displayName: "Accept Owner Guard Agency",
					marketScope: "both",
					ownerPrincipalId,
				},
			);

			// Convite `role=owner` e' impossivel pelo schema HTTP
			// (`inviteMemberBodySchema` exclui owner), entao semeia direto — e' o
			// unico jeito de exercitar a guarda. Sem este teste, apagar a guarda
			// deixava 147 unit + 30 PG verdes (G2 MEDIUM, achado por falsificacao).
			const membershipId = randomUUID();
			const rawToken = "owner-invite-token-for-guard-test";
			await pool.query(
				`INSERT INTO organizations_memberships
				   (id, tenant_id, agency_id, principal_id, invite_email, invite_token_hash,
				    invite_expires_at, role, status, invited_at, revision, created_at, updated_at)
				 VALUES ($1, $2, $2, NULL, $3, $4, now() + interval '7 days', 'owner', 'invited',
				         now(), 1, now(), now())`,
				[
					membershipId,
					agency.aggregateId,
					"owner-invite@example.com",
					inviteTokenHasher.hash(rawToken),
				],
			);

			let caught: unknown;
			try {
				await acceptInviteByToken(deps, {
					commandId: randomUUID(),
					token: rawToken,
					sessionPrincipalId: ownerPrincipalId,
					sessionEmail: "owner-invite@example.com",
				});
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(OrganizationCommandError);
			expect((caught as OrganizationCommandError).organizationCode).toBe(
				"ORG_INVALID_STATUS_TRANSITION",
			);
			expect((caught as OrganizationCommandError).statusCode).toBe(409);

			// Banco INTACTO: continua convite, sem principal, um unico owner ativo e
			// nenhum evento `membership.activated` (a transacao foi revertida).
			const row = await pool.query<{
				status: string;
				principal_id: string | null;
			}>(
				"SELECT status, principal_id FROM organizations_memberships WHERE id = $1",
				[membershipId],
			);
			expect(row.rows[0]?.status).toBe("invited");
			expect(row.rows[0]?.principal_id).toBeNull();

			const activeOwners = await pool.query<{ count: number }>(
				`SELECT count(*)::int AS count FROM organizations_memberships
				 WHERE agency_id = $1 AND role = 'owner' AND status = 'active'`,
				[agency.aggregateId],
			);
			expect(activeOwners.rows[0]?.count).toBe(1);

			const activated = await pool.query<{ count: number }>(
				`SELECT count(*)::int AS count FROM domain_journal
				 WHERE event_type = 'organizations.membership.activated.v1'
				   AND payload->>'membershipId' = $1`,
				[membershipId],
			);
			expect(activated.rows[0]?.count).toBe(0);
		});
	});

	test("G5-LOW-1: as 3 constraints da allowlist existem no banco (o espelho nao pode derivar)", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			// `MEMBERSHIP_CONFLICT_CONSTRAINTS` e' um espelho em codigo dos indices
			// criados pela migration 0001. Sem este oraculo, renomear um indice faz a
			// classificacao degradar em SILENCIO para 500 (G5 LOW-1).
			const indexes = await pool.query<{ indexname: string }>(
				`SELECT indexname FROM pg_indexes
				 WHERE schemaname = 'public' AND tablename = 'organizations_memberships'`,
			);
			const names = new Set(indexes.rows.map((row) => row.indexname));
			for (const constraint of MEMBERSHIP_CONFLICT_CONSTRAINTS) {
				expect(`${constraint}:${names.has(constraint)}`).toBe(
					`${constraint}:true`,
				);
			}
		});
	});

	test("reativacao legitima de vinculo nao-owner continua funcionando (sem outro vinculo ativo)", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const memberPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);
			const inviteTokenHasher = createHmacInviteTokenHasher(PEPPER);
			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([
					ownerPrincipalId,
					memberPrincipalId,
				]),
			};
			const memberEmail = "legit-reactivation@example.com";

			const agency = await createAgency(deps, {
				commandId: randomUUID(),
				displayName: "Legit Reactivation Agency",
				marketScope: "both",
				ownerPrincipalId,
			});
			const invite = await inviteMember(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					agencyId: agency.aggregateId,
					email: memberEmail,
					role: "operator",
					actorPrincipalId: ownerPrincipalId,
				},
			);
			await acceptInviteByToken(
				{
					...deps,
					inviteTokenHasher,
					membershipRepository: orgDb.membershipRepository,
				},
				{
					commandId: randomUUID(),
					token: invite.inviteToken,
					sessionPrincipalId: memberPrincipalId,
					sessionEmail: memberEmail,
				},
			);
			await revokeMembership(deps, {
				commandId: randomUUID(),
				agencyId: agency.aggregateId,
				membershipId: invite.result.aggregateId,
				actorPrincipalId: ownerPrincipalId,
			});

			const reactivated = await activateMembership(deps, {
				commandId: randomUUID(),
				agencyId: agency.aggregateId,
				membershipId: invite.result.aggregateId,
				actorPrincipalId: ownerPrincipalId,
				targetPrincipalId: memberPrincipalId,
			});
			expect(reactivated.aggregateId).toBe(invite.result.aggregateId);

			const row = await pool.query<{
				status: string;
				revoked_at: Date | null;
				principal_id: string | null;
			}>(
				"SELECT status, revoked_at, principal_id FROM organizations_memberships WHERE id = $1",
				[invite.result.aggregateId],
			);
			expect(row.rows[0]?.status).toBe("active");
			expect(row.rows[0]?.revoked_at).toBeNull();
			expect(row.rows[0]?.principal_id).toBe(memberPrincipalId);

			// Exatamente 1 owner ativo permanece (INV-ORG-02).
			const activeOwners = await pool.query<{ count: number }>(
				`SELECT count(*)::int AS count FROM organizations_memberships
				 WHERE agency_id = $1 AND role = 'owner' AND status = 'active'`,
				[agency.aggregateId],
			);
			expect(activeOwners.rows[0]?.count).toBe(1);
		});
	});
});
