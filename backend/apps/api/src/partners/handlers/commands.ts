import {
	registerPartner,
	registerPartnerCommandSchema,
} from "@anxionos/partners";
import type { PartnersPluginDeps } from "../plugin";

const registerPartnerBodySchema = registerPartnerCommandSchema
	.omit({ commandId: true, organizationId: true })
	.strict();

export async function handleRegisterPartner(
	deps: Pick<PartnersPluginDeps, "unitOfWork" | "commandJournal">,
	input: {
		commandId: string;
		organizationId: string;
		body: unknown;
	},
) {
	const body = registerPartnerBodySchema.parse(input.body);
	return registerPartner(
		{
			unitOfWork: deps.unitOfWork,
			commandJournal: deps.commandJournal,
		},
		{
			commandId: input.commandId,
			organizationId: input.organizationId,
			referralCode: body.referralCode,
			displayName: body.displayName,
			commissionRate: body.commissionRate,
			referredOrganizationId: body.referredOrganizationId,
		},
	);
}
