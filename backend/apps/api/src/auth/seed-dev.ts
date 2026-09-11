import { PLATFORM_CONSOLE_CAPABILITY } from "@anxionos/contracts/governance";
import { createPgPool } from "@anxionos/eventing/postgres";
import { ensureGovernanceSchema, issueGrant } from "@anxionos/governance";
import { createIdentityDb } from "@anxionos/identity";
import {
	acceptInviteByToken,
	createAgency,
	ensureOrganizationsSchema,
	inviteMember,
} from "@anxionos/organizations";
import { hashPassword } from "better-auth/crypto";
import { createGovernanceApiRuntime } from "../governance/bootstrap";
import {
	assertOrganizationsStartupEnv,
	createOrganizationsRuntime,
} from "../organizations/bootstrap";
import {
	createBetterAuthRuntime,
	resolveBetterAuthConfig,
} from "./create-better-auth";
import { ensureBetterAuthSchema } from "./ensure-better-auth-schema";

export const DEV_SEED_PASSWORD = "anxionos-dev-pass";

export const DEV_SEED_ACCOUNTS = {
	owner: "owner@anxionos.local",
	operator: "operator@anxionos.local",
	platform: "platform@anxionos.local",
	none: "none@anxionos.local",
	multi: "multi@anxionos.local",
} as const;

export interface PersonalOwnerSeed {
	email: string;
	password: string;
}

/** Optional second Owner (ANX-297). Password never belongs in source — only env. */
export function resolvePersonalOwnerSeed(
	env: NodeJS.ProcessEnv = process.env,
): PersonalOwnerSeed | null {
	const email = env.SEED_OWNER_EMAIL?.trim().toLowerCase() ?? "";
	const password = env.SEED_OWNER_PASSWORD ?? "";
	if (!email && !password) {
		return null;
	}
	if (!email || !password) {
		throw new Error(
			"seed:dev personal owner requires both SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD",
		);
	}
	return { email, password };
}

/** E2E fixtures stay verified. Personal Owner emails confirm via SMTP, not seed. */
export function shouldMarkSeedEmailVerified(email: string): boolean {
	return email.trim().toLowerCase().endsWith("@anxionos.local");
}

const COMMAND_IDS = {
	ownerAgency: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	multiAgencyA: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
	multiAgencyB: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
	inviteOperator: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
	acceptOperator: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
	personalOwnerAgency: "f1f1f1f1-f1f1-41f1-81f1-f1f1f1f1f1f1",
	platformScope: "abababab-abab-4aba-8aba-abababababab",
	issuePlatformGrant: "acacacac-acac-4aca-8aca-acacacacacac",
} as const;

export function assertDevSeedAllowed(
	env: NodeJS.ProcessEnv = process.env,
): void {
	if (env.NODE_ENV === "production") {
		throw new Error("seed:dev is blocked in production");
	}
	if (env.ALLOW_DEV_SEED !== "true") {
		throw new Error("seed:dev requires ALLOW_DEV_SEED=true");
	}
}

async function markEmailVerified(
	pool: ReturnType<typeof createPgPool>,
	email: string,
): Promise<void> {
	await pool.query(
		'UPDATE "user" SET "emailVerified" = TRUE WHERE email = $1',
		[email],
	);
}

async function findUserId(
	pool: ReturnType<typeof createPgPool>,
	email: string,
): Promise<string | undefined> {
	const result = await pool.query<{ id: string }>(
		'SELECT id FROM "user" WHERE email = $1',
		[email],
	);
	return result.rows[0]?.id;
}

async function setCredentialPassword(
	pool: ReturnType<typeof createPgPool>,
	userId: string,
	password: string,
): Promise<void> {
	const hashed = await hashPassword(password);
	const updated = await pool.query(
		`UPDATE account SET password = $1, "updatedAt" = NOW()
		 WHERE "userId" = $2 AND "providerId" = 'credential'`,
		[hashed, userId],
	);
	if ((updated.rowCount ?? 0) === 0) {
		throw new Error(`credential account missing for user ${userId}`);
	}
}

async function ensureUser(
	auth: Awaited<ReturnType<typeof createBetterAuthRuntime>>["auth"],
	pool: ReturnType<typeof createPgPool>,
	email: string,
	name: string,
	password: string = DEV_SEED_PASSWORD,
): Promise<string> {
	const existing = await findUserId(pool, email);
	if (!existing) {
		const signed = await auth.api.signUpEmail({
			body: {
				email,
				password,
				name,
			},
		});
		if (
			signed &&
			typeof signed === "object" &&
			"error" in signed &&
			signed.error
		) {
			const failure = signed.error as { message?: string; status?: number };
			throw new Error(
				`signUpEmail failed for ${email}: ${failure.message ?? failure.status}`,
			);
		}
	}
	if (shouldMarkSeedEmailVerified(email)) {
		await markEmailVerified(pool, email);
	}
	const userId = await findUserId(pool, email);
	if (!userId) {
		throw new Error(`user ${email} missing after seed`);
	}
	await setCredentialPassword(pool, userId, password);
	return userId;
}

const MULTI_B_AGENCY_ID = "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0";
const MULTI_B_MEMBERSHIP_ID = "c1c1c1c1-c1c1-41c1-81c1-c1c1c1c1c1c1";

async function findAgencyByCommandId(
	pool: ReturnType<typeof createPgPool>,
	commandId: string,
): Promise<string | undefined> {
	const result = await pool.query<{ aggregate_id: string }>(
		"SELECT aggregate_id FROM organizations_command_journal WHERE command_id = $1",
		[commandId],
	);
	return result.rows[0]?.aggregate_id;
}

async function insertAdditionalOwnedAgency(
	pool: ReturnType<typeof createPgPool>,
	input: {
		commandId: string;
		displayName: string;
		marketScope: "stocks" | "crypto" | "both";
		ownerPrincipalId: string;
	},
): Promise<{ aggregateId: string; revision: number }> {
	const agencyId = MULTI_B_AGENCY_ID;
	await pool.query(
		`INSERT INTO organizations_agencies (
			id, tenant_id, agency_id, owner_principal_id, display_name, market_scope,
			status, onboarding_step, revision
		) VALUES ($1, $1, $1, $2, $3, $4, 'draft', 'created', 1)
		ON CONFLICT (id) DO NOTHING`,
		[agencyId, input.ownerPrincipalId, input.displayName, input.marketScope],
	);
	await pool.query(
		`INSERT INTO organizations_memberships (
			id, tenant_id, agency_id, principal_id, invite_email, role, status,
			joined_at, revision
		) VALUES ($1, $2, $2, $3, NULL, 'owner', 'active', NOW(), 1)
		ON CONFLICT (id) DO NOTHING`,
		[MULTI_B_MEMBERSHIP_ID, agencyId, input.ownerPrincipalId],
	);
	await pool.query(
		`INSERT INTO organizations_command_journal (
			command_id, command_name, aggregate_id, aggregate_type, revision, response_snapshot
		) VALUES ($1, 'CreateAgency', $2, 'Agency', 1, $3::jsonb)
		ON CONFLICT (command_id) DO NOTHING`,
		[
			input.commandId,
			agencyId,
			JSON.stringify({ aggregateId: agencyId, revision: 1 }),
		],
	);
	return { aggregateId: agencyId, revision: 1 };
}

function isUniqueViolation(error: unknown): boolean {
	if (!error || typeof error !== "object" || !("code" in error)) {
		return false;
	}
	return error.code === "23505";
}

async function ensureSeedAgency(
	pool: ReturnType<typeof createPgPool>,
	org: ReturnType<typeof createOrganizationsRuntime>,
	input: {
		commandId: string;
		displayName: string;
		marketScope: "stocks" | "crypto" | "both";
		ownerPrincipalId: string;
	},
): Promise<{ aggregateId: string; revision: number }> {
	const existing = await findAgencyByCommandId(pool, input.commandId);
	if (existing) {
		return { aggregateId: existing, revision: 1 };
	}
	try {
		return await createAgency(
			{
				unitOfWork: org.unitOfWork,
				commandJournal: org.commandJournal,
				principalLookup: org.principalLookup,
			},
			input,
		);
	} catch (error) {
		if (!isUniqueViolation(error)) {
			throw error;
		}
		if (input.commandId === COMMAND_IDS.multiAgencyB) {
			return insertAdditionalOwnedAgency(pool, input);
		}
		const fallback = await pool.query<{ id: string }>(
			"SELECT id FROM organizations_agencies WHERE owner_principal_id = $1 LIMIT 1",
			[input.ownerPrincipalId],
		);
		if (fallback.rows[0]) {
			return { aggregateId: fallback.rows[0].id, revision: 1 };
		}
		throw error;
	}
}

export async function seedDevAccounts(): Promise<{
	ownerAgencyId: string;
	operatorAgencyId: string;
	personalOwnerEmail?: string;
	personalOwnerAgencyId?: string;
}> {
	assertDevSeedAllowed();
	const databaseUrl = process.env.DATABASE_URL?.trim();
	if (!databaseUrl) {
		throw new Error("seed:dev requires DATABASE_URL");
	}
	if (!resolveBetterAuthConfig()) {
		throw new Error("seed:dev requires BETTER_AUTH_SECRET and BETTER_AUTH_URL");
	}

	const pool = createPgPool(databaseUrl);
	try {
		await ensureBetterAuthSchema(pool);
		assertOrganizationsStartupEnv();
		await ensureOrganizationsSchema(pool);
		const identity = createIdentityDb(pool);
		const { auth } = await createBetterAuthRuntime(pool, {
			repository: identity.repository,
			unitOfWork: identity.unitOfWork,
		});
		const org = createOrganizationsRuntime(pool, databaseUrl);

		const ownerAuthId = await ensureUser(
			auth,
			pool,
			DEV_SEED_ACCOUNTS.owner,
			"Owner Dev",
		);
		const operatorAuthId = await ensureUser(
			auth,
			pool,
			DEV_SEED_ACCOUNTS.operator,
			"Operator Dev",
		);
		await ensureUser(auth, pool, DEV_SEED_ACCOUNTS.none, "None Dev");
		const platformAuthId = await ensureUser(
			auth,
			pool,
			DEV_SEED_ACCOUNTS.platform,
			"Platform Dev",
		);
		const multiAuthId = await ensureUser(
			auth,
			pool,
			DEV_SEED_ACCOUNTS.multi,
			"Multi Dev",
		);

		const ownerPrincipal =
			await identity.repository.findByAuthUserId(ownerAuthId);
		const operatorPrincipal =
			await identity.repository.findByAuthUserId(operatorAuthId);
		const multiPrincipal =
			await identity.repository.findByAuthUserId(multiAuthId);
		const platformPrincipal =
			await identity.repository.findByAuthUserId(platformAuthId);
		if (
			!ownerPrincipal ||
			!operatorPrincipal ||
			!multiPrincipal ||
			!platformPrincipal
		) {
			throw new Error("seed:dev missing principals after Better Auth signup");
		}

		await ensureGovernanceSchema(pool);
		const gov = createGovernanceApiRuntime(pool);
		await issueGrant(
			{
				unitOfWork: gov.unitOfWork,
				commandJournal: gov.commandJournal,
				principalLookup: gov.principalLookup,
			},
			{
				commandId: COMMAND_IDS.issuePlatformGrant,
				scopeId: COMMAND_IDS.platformScope,
				granteePrincipalId: platformPrincipal.id,
				capability: PLATFORM_CONSOLE_CAPABILITY,
			},
		);

		const ownerAgency = await ensureSeedAgency(pool, org, {
			commandId: COMMAND_IDS.ownerAgency,
			displayName: "Agência Owner (dev seed)",
			marketScope: "both",
			ownerPrincipalId: ownerPrincipal.id,
		});

		await ensureSeedAgency(pool, org, {
			commandId: COMMAND_IDS.multiAgencyA,
			displayName: "Agência Multi A (dev seed)",
			marketScope: "stocks",
			ownerPrincipalId: multiPrincipal.id,
		});
		await ensureSeedAgency(pool, org, {
			commandId: COMMAND_IDS.multiAgencyB,
			displayName: "Agência Multi B (dev seed)",
			marketScope: "crypto",
			ownerPrincipalId: multiPrincipal.id,
		});

		try {
			const invited = await inviteMember(
				{
					unitOfWork: org.unitOfWork,
					commandJournal: org.commandJournal,
					inviteTokenHasher: org.inviteTokenHasher,
				},
				{
					commandId: COMMAND_IDS.inviteOperator,
					agencyId: ownerAgency.aggregateId,
					email: DEV_SEED_ACCOUNTS.operator,
					role: "operator",
					actorPrincipalId: ownerPrincipal.id,
				},
			);
			if (invited.inviteToken) {
				await acceptInviteByToken(
					{
						unitOfWork: org.unitOfWork,
						commandJournal: org.commandJournal,
						membershipRepository: org.membershipRepository,
						inviteTokenHasher: org.inviteTokenHasher,
					},
					{
						commandId: COMMAND_IDS.acceptOperator,
						token: invited.inviteToken,
						sessionPrincipalId: operatorPrincipal.id,
						sessionEmail: DEV_SEED_ACCOUNTS.operator,
					},
				);
			}
		} catch (error) {
			const code =
				error && typeof error === "object" && "organizationCode" in error
					? String(error.organizationCode)
					: "";
			if (code !== "ORG_MEMBERSHIP_EXISTS") {
				throw error;
			}
		}

		const personal = resolvePersonalOwnerSeed();
		let personalOwnerAgencyId: string | undefined;
		if (personal) {
			const personalAuthId = await ensureUser(
				auth,
				pool,
				personal.email,
				"Owner",
				personal.password,
			);
			const personalPrincipal =
				await identity.repository.findByAuthUserId(personalAuthId);
			if (!personalPrincipal) {
				throw new Error("seed:dev missing principal for SEED_OWNER_EMAIL");
			}
			if (personal.email.toLowerCase() === DEV_SEED_ACCOUNTS.owner) {
				personalOwnerAgencyId = ownerAgency.aggregateId;
			} else {
				const personalAgency = await ensureSeedAgency(pool, org, {
					commandId: COMMAND_IDS.personalOwnerAgency,
					displayName: "Agência Owner (seed)",
					marketScope: "both",
					ownerPrincipalId: personalPrincipal.id,
				});
				personalOwnerAgencyId = personalAgency.aggregateId;
			}
		}

		return {
			ownerAgencyId: ownerAgency.aggregateId,
			operatorAgencyId: ownerAgency.aggregateId,
			...(personal
				? {
						personalOwnerEmail: personal.email,
						personalOwnerAgencyId,
					}
				: {}),
		};
	} finally {
		await pool.end();
	}
}

if (import.meta.main) {
	seedDevAccounts()
		.then((result) => {
			console.log(
				JSON.stringify({
					ok: true,
					accounts: {
						...DEV_SEED_ACCOUNTS,
						...(result.personalOwnerEmail
							? { personalOwner: result.personalOwnerEmail }
							: {}),
					},
					ownerAgencyId: result.ownerAgencyId,
					operatorAgencyId: result.operatorAgencyId,
					...(result.personalOwnerAgencyId
						? { personalOwnerAgencyId: result.personalOwnerAgencyId }
						: {}),
				}),
			);
		})
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}
