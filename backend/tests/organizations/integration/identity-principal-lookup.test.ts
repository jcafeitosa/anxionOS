import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	createPgPool,
	ensureEventingSchema,
} from "@anxionos/eventing/postgres";
import { ensureIdentitySchema } from "@anxionos/identity";
import { createIdentityPrincipalLookup } from "@anxionos/organizations";
import { PrincipalLookupUnavailableError } from "../../../modules/organizations/src/domain/ports/principal-lookup";
import { getDatabaseUrl, shouldRunPgIntegrationTests } from "../test-support";

describe("createIdentityPrincipalLookup integration", () => {
	test("returns true for active principal and false for missing principal", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		const url = getDatabaseUrl();
		if (!url) {
			return;
		}

		const pool = createPgPool(url);
		const principalId = randomUUID();
		const missingPrincipalId = randomUUID();

		try {
			await ensureEventingSchema(pool);
			await ensureIdentitySchema(pool);
			await pool.query(
				`INSERT INTO identity_principals (id, auth_user_id, email, status, created_at, suspended_at, suspension_reason)
         VALUES ($1, $2, $3, 'active', NOW(), NULL, NULL)`,
				[
					principalId,
					randomUUID(),
					`lookup-${principalId.slice(0, 8)}@example.com`,
				],
			);

			const lookup = createIdentityPrincipalLookup(pool);
			await expect(lookup.exists(principalId)).resolves.toBe(true);
			await expect(lookup.exists(missingPrincipalId)).resolves.toBe(false);
		} finally {
			await pool.query("DELETE FROM identity_principals WHERE id = $1", [
				principalId,
			]);
			await pool.end();
		}
	});

	test("returns false for suspended principal", async () => {
		if (!shouldRunPgIntegrationTests()) {
			return;
		}

		const url = getDatabaseUrl();
		if (!url) {
			return;
		}

		const pool = createPgPool(url);
		const principalId = randomUUID();

		try {
			await ensureEventingSchema(pool);
			await ensureIdentitySchema(pool);
			await pool.query(
				`INSERT INTO identity_principals (id, auth_user_id, email, status, created_at, suspended_at, suspension_reason)
         VALUES ($1, $2, $3, 'suspended', NOW(), NOW(), 'test')`,
				[
					principalId,
					randomUUID(),
					`suspended-${principalId.slice(0, 8)}@example.com`,
				],
			);

			const lookup = createIdentityPrincipalLookup(pool);
			await expect(lookup.exists(principalId)).resolves.toBe(false);
		} finally {
			await pool.query("DELETE FROM identity_principals WHERE id = $1", [
				principalId,
			]);
			await pool.end();
		}
	});

	test("maps repository failures to PrincipalLookupUnavailableError", async () => {
		const lookup = createIdentityPrincipalLookup({
			query: async () => {
				throw new Error("simulated database outage");
			},
		} as never);

		await expect(lookup.exists(randomUUID())).rejects.toBeInstanceOf(
			PrincipalLookupUnavailableError,
		);
	});
});
