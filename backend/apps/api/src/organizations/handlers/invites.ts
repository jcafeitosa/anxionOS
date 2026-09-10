import { acceptInviteByTokenCommandSchema } from "@anxionos/contracts/organizations";
import { acceptInviteByToken } from "@anxionos/organizations";
import { z } from "zod";
import type { OrganizationsPluginDeps } from "../plugin";

const acceptInviteBodySchema = z.object({ token: z.string().min(1) }).strict();

export async function handleAcceptInvite(
	deps: OrganizationsPluginDeps,
	input: {
		commandId: string;
		principalId: string;
		sessionEmail: string;
		body: unknown;
	},
) {
	const body = acceptInviteBodySchema.parse(input.body);
	const command = acceptInviteByTokenCommandSchema.parse({
		commandId: input.commandId,
		token: body.token,
	});
	return acceptInviteByToken(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
			membershipRepository: deps.membershipRepository,
			inviteTokenHasher: deps.inviteTokenHasher,
		},
		{
			...command,
			sessionPrincipalId: input.principalId,
			sessionEmail: input.sessionEmail,
		},
	);
}
