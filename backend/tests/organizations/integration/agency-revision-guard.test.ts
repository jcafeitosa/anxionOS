import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createAgency,
	createOrganizationsDb,
	createOrganizationUnitOfWork,
} from "@anxionos/organizations";
import { AgencyRevisionConflictError } from "../../../modules/organizations/src/domain/errors/agency-errors";
import {
	createStubPrincipalLookup,
	shouldRunPgIntegrationTests,
	withOrganizationsPgHarness,
} from "../test-support";

/**
 * S4c (ANX-460) — prova em PostgreSQL real de que `Agency.save` tem guarda
 * otimista. Antes da correcao o `UPDATE` era cego (`.where(eq(agencies.id, ...))`)
 * e uma gravacao com revisao obsoleta sobrescrevia a alteracao concorrente em
 * silencio (lost update), publicando evento com `previous*` obsoleto.
 *
 * O teste de unidade (`tests/organizations/lifecycle-conflicts.test.ts`) exercita
 * o espelho em memoria; este exercita o repositorio Drizzle contra o banco, que e'
 * onde o defeito vivia.
 */
describe("Agency.save revision guard (PG integration)", () => {
	test("grava com a revisao corrente e rejeita a revisao obsoleta sem sobrescrever", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);

			const created = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				},
				{
					commandId: randomUUID(),
					displayName: "Revision Guard Agency",
					marketScope: "both",
					ownerPrincipalId,
				},
			);

			// Visao 1 e visao 2 do MESMO agregado na revisao 1 — duas transacoes
			// concorrentes que leram antes de qualquer gravacao.
			const readA = await orgDb.agencyRepository.findByAgencyId(
				created.aggregateId,
			);
			const readB = await orgDb.agencyRepository.findByAgencyId(
				created.aggregateId,
			);
			expect(readA?.revision).toBe(1);
			expect(readB?.revision).toBe(1);
			if (!readA || !readB) throw new Error("agency not read");

			// A vence e grava a revisao 2.
			const now = new Date();
			const winner = await orgDb.agencyRepository.save({
				...readA,
				marketScope: "crypto",
				revision: 2,
				updatedAt: now,
			});
			expect(winner.revision).toBe(2);

			// B tenta gravar a revisao 2 a partir da leitura obsoleta: deve ser
			// rejeitada, e nao sobrescrever a vitoria de A.
			let caught: unknown;
			try {
				await orgDb.agencyRepository.save({
					...readB,
					marketScope: "stocks",
					revision: 2,
					updatedAt: now,
				});
			} catch (error) {
				caught = error;
			}
			expect(caught).toBeInstanceOf(AgencyRevisionConflictError);

			const persisted = await orgDb.agencyRepository.findByAgencyId(
				created.aggregateId,
			);
			expect(persisted?.revision).toBe(2);
			expect(persisted?.marketScope).toBe("crypto");
		});
	});

	test("revisao sequencial legitima continua gravando", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		await withOrganizationsPgHarness(async ({ pool }) => {
			const ownerPrincipalId = randomUUID();
			const orgDb = createOrganizationsDb(pool);
			const unitOfWork = createOrganizationUnitOfWork(pool);

			const created = await createAgency(
				{
					unitOfWork,
					commandJournal: orgDb.commandJournal,
					principalLookup: createStubPrincipalLookup([ownerPrincipalId]),
				},
				{
					commandId: randomUUID(),
					displayName: "Sequential Revision Agency",
					marketScope: "both",
					ownerPrincipalId,
				},
			);

			let current = await orgDb.agencyRepository.findByAgencyId(
				created.aggregateId,
			);
			if (!current) throw new Error("agency not read");

			// Retry legitimo: cada gravacao rele' antes de avancar a revisao.
			for (const scope of ["crypto", "stocks", "both"] as const) {
				const now = new Date();
				current = await orgDb.agencyRepository.save({
					...current,
					marketScope: scope,
					revision: current.revision + 1,
					updatedAt: now,
				});
			}

			expect(current.revision).toBe(4);
			expect(current.marketScope).toBe("both");
			const persisted = await orgDb.agencyRepository.findByAgencyId(
				created.aggregateId,
			);
			expect(persisted?.revision).toBe(4);
			expect(persisted?.marketScope).toBe("both");
		});
	});
});
