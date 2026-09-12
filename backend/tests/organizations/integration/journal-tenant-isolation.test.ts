import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createAgency,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
} from "@anxionos/organizations";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	withOrganizationsPgHarness,
} from "../test-support";

/**
 * ANX-480: Prova que o journal de comandos é isolado por tenant_id,
 * prevenindo colisões e vazamentos de idempotency keys cross-tenant.
 *
 * Antes desta correção, Idempotency-Key era um namespace global: dois tenants
 * usando a MESMA key colidiam ou vazavam informações (nome do comando). Agora,
 * com tenant_id + RLS, cada tenant tem seu próprio namespace de keys.
 */
describe("organizations command journal tenant isolation (ANX-480)", () => {
	test("same Idempotency-Key in two tenants creates two independent agencies", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);

			// Mesma Idempotency-Key para dois tenants diferentes
			const sharedCommandId = randomUUID();

			// Tenant 1: Owner A
			const ownerA = randomUUID();
			const agencyA = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerA]),
				},
				{
					commandId: sharedCommandId,
					displayName: "Agency A",
					marketScope: "stocks",
					ownerPrincipalId: ownerA,
				},
			);

			// Tenant 2: Owner B, MESMA key
			const ownerB = randomUUID();
			const agencyB = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerB]),
				},
				{
					commandId: sharedCommandId, // ← MESMA key
					displayName: "Agency B",
					marketScope: "crypto",
					ownerPrincipalId: ownerB,
				},
			);

			// Prova de isolamento: dois agregados distintos foram criados
			expect(agencyA.aggregateId).not.toBe(agencyB.aggregateId);
			expect(agencyA.idempotentReplay).toBeUndefined();
			expect(agencyB.idempotentReplay).toBeUndefined();

			// Prova de persistência: ambos existem no banco
			const agencies = await pool.query(
				"SELECT id, owner_principal_id, display_name FROM organizations_agencies WHERE id = ANY($1::uuid[])",
				[[agencyA.aggregateId, agencyB.aggregateId]],
			);
			expect(agencies.rows).toHaveLength(2);

			// Prova de journal: dois registros com a MESMA command_id mas tenants distintos
			const journal = await pool.query(
				"SELECT command_id, tenant_id, command_name, aggregate_id FROM organizations_command_journal WHERE command_id = $1",
				[sharedCommandId],
			);
			expect(journal.rows).toHaveLength(2);
			expect(journal.rows[0]?.tenant_id).not.toBe(journal.rows[1]?.tenant_id);
		});
	});

	test("cross-tenant Idempotency-Key does not leak command name on conflict attempt", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);

			const sharedCommandId = randomUUID();

			// Tenant 1: Cria com key K
			const ownerA = randomUUID();
			await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerA]),
				},
				{
					commandId: sharedCommandId,
					displayName: "Agency A",
					marketScope: "stocks",
					ownerPrincipalId: ownerA,
				},
			);

			// Tenant 2: Tenta reusar a MESMA key com payload divergente
			// (dentro do próprio tenant seria 409, mas aqui deve criar novo)
			const ownerB = randomUUID();
			const resultB = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerB]),
				},
				{
					commandId: sharedCommandId, // ← MESMA key
					displayName: "Different Agency", // ← payload divergente
					marketScope: "crypto",
					ownerPrincipalId: ownerB,
				},
			);

			// Prova: Tenant 2 cria normalmente (não colide)
			expect(resultB.idempotentReplay).toBeUndefined();

			// Prova adicional: dentro do MESMO tenant, reuso divergente É 409
			const ownerC = randomUUID();
			const keyC = randomUUID();

			// Primeira criação
			await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerC]),
				},
				{
					commandId: keyC,
					displayName: "Agency C",
					marketScope: "both",
					ownerPrincipalId: ownerC,
				},
			);

			// Reuso divergente DENTRO do mesmo tenant → 409
			await expect(
				createAgency(
					{
						unitOfWork,
						commandJournal: orgDb.commandJournal,
						principalLookup: createStubPrincipalLookup([ownerC]),
					},
					{
						commandId: keyC, // ← mesma key
						displayName: "Divergent Agency", // ← payload diferente
						marketScope: "crypto",
						ownerPrincipalId: ownerC,
					},
				),
			).rejects.toMatchObject({
				organizationCode: "ORG_DUPLICATE_IDEMPOTENCY",
				statusCode: 409,
			});
		});
	});

	test("replay within same tenant still works after tenant isolation", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);

			const commandId = randomUUID();
			const owner = randomUUID();

			const deps = {
				unitOfWork,
				commandJournal: orgDb.commandJournal,
				principalLookup: createStubPrincipalLookup([owner]),
			};

			// Primeira criação
			const first = await createAgency(deps, {
				commandId,
				displayName: "Idempotent Agency",
				marketScope: "both",
				ownerPrincipalId: owner,
			});

			// Replay com MESMO payload
			const replay = await createAgency(deps, {
				commandId,
				displayName: "Idempotent Agency",
				marketScope: "both",
				ownerPrincipalId: owner,
			});

			// Prova: replay funciona
			expect(replay.aggregateId).toBe(first.aggregateId);
			expect(replay.idempotentReplay).toBe(true);

			// Prova: só uma agency foi criada
			const agencies = await pool.query(
				"SELECT count(*)::int AS count FROM organizations_agencies WHERE owner_principal_id = $1",
				[owner],
			);
			expect(agencies.rows[0]?.count).toBe(1);
		});
	});
});
