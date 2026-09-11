import { describe, expect, test } from "bun:test";
import {
	approveRecoveryTaskCommandSchema,
	createIncidentCommandSchema,
	OPERATIONS_ERROR_CODES,
	startRecoveryTaskCommandSchema,
	transitionIncidentStatusCommandSchema,
} from "@anxionos/contracts/operations";
import { OperationsCommandError } from "@anxionos/operations";
import { assertActorCanMutate } from "@anxionos/organizations";
import { mapOperationsError } from "../../apps/api/src/operations/error-handler";
import { incidentIdParamSchema } from "../../apps/api/src/operations/handlers/incidents";
import { recoveryTaskIdParamSchema } from "../../apps/api/src/operations/handlers/recovery-tasks";
import { createOperationsPlugin } from "../../apps/api/src/operations/plugin";
import type { Membership } from "../../modules/organizations/src/domain/entities/membership";
import { createInMemoryMembershipRepository } from "../organizations/test-support";

const agencyId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function activeMembership(
	role: Membership["role"],
	principalId: string,
): Membership {
	const now = new Date("2026-09-11T00:00:00.000Z");
	return {
		id: `${role}-${principalId}`,
		agencyId,
		principalId,
		inviteEmail: null,
		inviteTokenHash: null,
		inviteExpiresAt: null,
		role,
		status: "active",
		invitedAt: null,
		joinedAt: now,
		revokedAt: null,
		revision: 1,
		createdAt: now,
		updatedAt: now,
	};
}

describe("operations POST RBAC (ANX-158 S4e)", () => {
	test("viewer membership is rejected with 403 via assertActorCanMutate", async () => {
		const viewerId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
		const repo = createInMemoryMembershipRepository([
			activeMembership("viewer", viewerId),
		]);
		await expect(
			assertActorCanMutate(repo, viewerId, agencyId),
		).rejects.toMatchObject({
			organizationCode: "ORG_CROSS_TENANT",
			statusCode: 403,
		});
		const mapped = mapOperationsError(
			await assertActorCanMutate(repo, viewerId, agencyId).catch(
				(error) => error,
			),
		);
		expect(mapped.status).toBe(403);
	});

	test("operator membership passes mutation guard", async () => {
		const operatorId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
		const repo = createInMemoryMembershipRepository([
			activeMembership("operator", operatorId),
		]);
		const membership = await assertActorCanMutate(repo, operatorId, agencyId);
		expect(membership.role).toBe("operator");
	});

	test.each([
		["owner", "dddddddd-dddd-4ddd-8ddd-dddddddddd01"],
		["admin", "dddddddd-dddd-4ddd-8ddd-dddddddddd02"],
		["operator", "dddddddd-dddd-4ddd-8ddd-dddddddddd03"],
	] as const)(
		"%s membership passes mutation guard",
		async (role, principalId) => {
			const repo = createInMemoryMembershipRepository([
				activeMembership(role, principalId),
			]);
			const membership = await assertActorCanMutate(
				repo,
				principalId,
				agencyId,
			);
			expect(membership.role).toBe(role);
		},
	);
});

describe("operations API boundary", () => {
	test("openIncident body schema strips organizationId tampering", () => {
		const parsed = createIncidentCommandSchema
			.omit({
				commandId: true,
				organizationId: true,
			})
			.strict()
			.safeParse({
				title: "Probe failure",
				severity: "HIGH",
				organizationId: "00000000-0000-4000-8000-000000000099",
			});
		expect(parsed.success).toBe(false);
	});

	test("transitionIncidentStatus body schema strips incidentId tampering", () => {
		const parsed = transitionIncidentStatusCommandSchema
			.omit({
				commandId: true,
				organizationId: true,
				incidentId: true,
			})
			.strict()
			.safeParse({
				expectedRevision: 1,
				targetStatus: "ACKNOWLEDGED",
				incidentId: "ops_inc_11111111-1111-4111-8111-111111111111",
			});
		expect(parsed.success).toBe(false);
	});

	test("startRecoveryTask body schema strips organizationId and principal tampering", () => {
		const parsed = startRecoveryTaskCommandSchema
			.omit({
				commandId: true,
				organizationId: true,
				incidentId: true,
				initiatedByPrincipalId: true,
			})
			.strict()
			.safeParse({
				stepKind: "VALIDATE_SCHEMA",
				organizationId: "00000000-0000-4000-8000-000000000099",
				initiatedByPrincipalId: "00000000-0000-4000-8000-000000000088",
			});
		expect(parsed.success).toBe(false);
	});

	test("approveRecoveryTask body schema rejects body principal tampering", () => {
		const parsed = approveRecoveryTaskCommandSchema
			.omit({
				commandId: true,
				organizationId: true,
				recoveryTaskId: true,
				approvedByPrincipalId: true,
			})
			.strict()
			.safeParse({
				expectedRevision: 1,
				approvedByPrincipalId: "00000000-0000-4000-8000-000000000088",
			});
		expect(parsed.success).toBe(false);
	});

	test("mapOperationsError maps OPS_RECOVERY_TASK_NOT_FOUND to 404", () => {
		const error = new OperationsCommandError(
			OPERATIONS_ERROR_CODES.RECOVERY_TASK_NOT_FOUND,
			"recovery task not found",
		);
		const mapped = mapOperationsError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: OPERATIONS_ERROR_CODES.RECOVERY_TASK_NOT_FOUND,
		});
	});

	test("mapOperationsError maps OPS_INCIDENT_NOT_FOUND to 404", () => {
		const error = new OperationsCommandError(
			OPERATIONS_ERROR_CODES.INCIDENT_NOT_FOUND,
			"incident not found",
		);
		const mapped = mapOperationsError(error);
		expect(mapped.status).toBe(404);
		expect(mapped.body.error.details).toEqual({
			code: OPERATIONS_ERROR_CODES.INCIDENT_NOT_FOUND,
		});
	});

	test("mapOperationsError maps OPS_CROSS_TENANT to 403", () => {
		const error = new OperationsCommandError(
			OPERATIONS_ERROR_CODES.CROSS_TENANT,
			"command journal organization mismatch",
		);
		const mapped = mapOperationsError(error);
		expect(mapped.status).toBe(403);
		expect(mapped.body.error.details).toEqual({
			code: OPERATIONS_ERROR_CODES.CROSS_TENANT,
		});
	});

	test("mapOperationsError maps OPS_RECOVERY_STATUS_INVALID to 409", () => {
		const error = new OperationsCommandError(
			OPERATIONS_ERROR_CODES.RECOVERY_STATUS_INVALID,
			"invalid status transition",
		);
		const mapped = mapOperationsError(error);
		expect(mapped.status).toBe(409);
	});

	test("mapOperationsError maps OPS_RECOVERY_STEP_KIND_REJECTED to 400", () => {
		const error = new OperationsCommandError(
			OPERATIONS_ERROR_CODES.RECOVERY_STEP_KIND_REJECTED,
			"step kind rejected",
		);
		const mapped = mapOperationsError(error);
		expect(mapped.status).toBe(400);
	});

	test("path param schemas reject tampered ids", () => {
		expect(incidentIdParamSchema.safeParse({ incidentId: "bad" }).success).toBe(
			false,
		);
		expect(
			recoveryTaskIdParamSchema.safeParse({ recoveryTaskId: "bad" }).success,
		).toBe(false);
		expect(
			incidentIdParamSchema.safeParse({
				incidentId: "ops_inc_11111111-1111-4111-8111-111111111111",
			}).success,
		).toBe(true);
		expect(
			recoveryTaskIdParamSchema.safeParse({
				recoveryTaskId: "ops_rcv_22222222-2222-4222-8222-222222222222",
			}).success,
		).toBe(true);
	});
});

describe("operations plugin routes (ANX-158 S4f + S2 HTTP)", () => {
	test("registers incident and recovery task routes", () => {
		const plugin = createOperationsPlugin({
			auth: { api: { getSession: async () => null } } as never,
			identityRepository: {} as never,
			scopedPool: {} as never,
			unitOfWork: {} as never,
			commandJournal: {} as never,
			incidents: {} as never,
			recoveryTasks: {} as never,
			grantRepository: {} as never,
			probePlatformHealth: async () => ({
				postgres: "ok",
				nats: "ok",
				neo4j: "ok",
			}),
		});
		const routes = plugin.routes.map((route) => route.path);
		expect(routes).toContain("/v1/operations/platform/health");
		expect(routes).toContain("/v1/operations/platform/incidents");
		expect(routes).toContain("/v1/operations/platform/runtimes");
		expect(routes).toContain("/v1/operations/platform/recovery");
		expect(routes).toContain("/v1/operations/agencies/:agencyId/incidents");
		expect(routes).toContain(
			"/v1/operations/agencies/:agencyId/incidents/:incidentId",
		);
		expect(routes).toContain(
			"/v1/operations/agencies/:agencyId/incidents/:incidentId/transition-status",
		);
		expect(routes).toContain(
			"/v1/operations/agencies/:agencyId/incidents/:incidentId/attach-runbook",
		);
		expect(routes).toContain(
			"/v1/operations/agencies/:agencyId/recovery-tasks/:recoveryTaskId",
		);
		expect(routes).toContain(
			"/v1/operations/agencies/:agencyId/incidents/:incidentId/recovery-tasks",
		);
	});
});
