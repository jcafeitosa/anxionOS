import { describe, expect, test } from "bun:test";
import type { Principal } from "@anxionos/identity";
import {
	handlePrincipalSuspended,
	SessionRevocationUnavailableError,
} from "@anxionos/identity";
import { createInMemoryPrincipalRepository } from "./test-support";

const principal: Principal = {
	id: "11111111-1111-4111-8111-111111111111",
	authUserId: "auth-1",
	email: "owner@example.com",
	status: "suspended",
	createdAt: new Date("2026-09-08T12:00:00.000Z"),
	suspendedAt: new Date("2026-09-08T12:00:00.000Z"),
	suspensionReason: "ops.manual",
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
};

const activePrincipal: Principal = {
	...principal,
	status: "active",
	suspendedAt: null,
	suspensionReason: null,
	kind: "human",
	revision: 1,
	revokedAt: null,
	revocationReason: null,
};

describe("handlePrincipalSuspended", () => {
	test("does not revoke sessions when principal is still active", async () => {
		const revoked: string[] = [];
		await handlePrincipalSuspended(
			{
				principalRepository: createInMemoryPrincipalRepository([
					activePrincipal,
				]),
				sessionRevoker: {
					async revokeAllForAuthUser(authUserId) {
						revoked.push(authUserId);
					},
				},
			},
			{
				principalId: activePrincipal.id,
				reasonCode: "ops.manual",
				suspendedAt: "2026-09-08T12:00:00.000Z",
			},
		);
		expect(revoked).toEqual([]);
	});

	test("revokes sessions for resolved auth user", async () => {
		const revoked: string[] = [];
		await handlePrincipalSuspended(
			{
				principalRepository: createInMemoryPrincipalRepository([principal]),
				sessionRevoker: {
					async revokeAllForAuthUser(authUserId) {
						revoked.push(authUserId);
					},
				},
			},
			{
				principalId: principal.id,
				reasonCode: "ops.manual",
				suspendedAt: "2026-09-08T12:00:00.000Z",
			},
		);
		expect(revoked).toEqual(["auth-1"]);
	});

	test("no-ops when principal is missing", async () => {
		const revoked: string[] = [];
		await handlePrincipalSuspended(
			{
				principalRepository: createInMemoryPrincipalRepository(),
				sessionRevoker: {
					async revokeAllForAuthUser(authUserId) {
						revoked.push(authUserId);
					},
				},
			},
			{
				principalId: principal.id,
				reasonCode: "ops.manual",
				suspendedAt: "2026-09-08T12:00:00.000Z",
			},
		);
		expect(revoked).toEqual([]);
	});

	test("propagates SessionRevocationUnavailableError when revoker fails", async () => {
		await expect(
			handlePrincipalSuspended(
				{
					principalRepository: createInMemoryPrincipalRepository([principal]),
					sessionRevoker: {
						async revokeAllForAuthUser() {
							throw new Error("better-auth unavailable");
						},
					},
				},
				{
					principalId: principal.id,
					reasonCode: "ops.manual",
					suspendedAt: "2026-09-08T12:00:00.000Z",
				},
			),
		).rejects.toBeInstanceOf(SessionRevocationUnavailableError);
	});
});
