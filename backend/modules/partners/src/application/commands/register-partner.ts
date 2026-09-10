import { randomUUID } from "node:crypto";
import type {
	PartnersCommandResult,
	RegisterPartnerCommand,
} from "@anxionos/contracts/partners";
import {
	partnersCommandResultSchema,
	registerPartnerCommandSchema,
} from "@anxionos/contracts/partners";
import type { PartnersUnitOfWork } from "../../domain/ports/partners-unit-of-work";
import type { CommandJournalRepository } from "../../domain/ports/command-journal";
import {
	loadIdempotentCommandResult,
	toCommandResultSnapshot,
} from "../command-support";
import { parseCommandResultSnapshot, throwPartnersError } from "../errors";

export interface RegisterPartnerDeps {
	unitOfWork: PartnersUnitOfWork;
	commandJournal: CommandJournalRepository;
}

export async function registerPartner(
	deps: RegisterPartnerDeps,
	input: RegisterPartnerCommand,
): Promise<PartnersCommandResult> {
	const command = registerPartnerCommandSchema.parse(input);
	const existingCommand = await deps.commandJournal.findByCommandId(
		command.commandId,
	);
	if (
		existingCommand &&
		existingCommand.organizationId !== command.organizationId
	) {
		throwPartnersError(
			"PTR_CROSS_TENANT",
			"command journal organization mismatch",
		);
	}
	const replay = await loadIdempotentCommandResult(
		deps.commandJournal,
		command.commandId,
	);
	if (replay) return replay;
	return deps.unitOfWork.runInTransaction(async (ctx) => {
		const raced = await ctx.commandJournal.findByCommandId(command.commandId);
		if (raced) {
			const parsed = parseCommandResultSnapshot(raced.responseSnapshot);
			return partnersCommandResultSchema.parse({
				...parsed,
				idempotentReplay: true,
			});
		}
		const referralConflict = await ctx.partners.findByReferralCode(
			command.referralCode,
			command.organizationId,
		);
		if (referralConflict) {
			throwPartnersError(
				"PTR_REFERRAL_CONFLICT",
				"referral code already registered",
			);
		}
		const referredConflict = await ctx.partners.findByReferredOrganization(
			command.referredOrganizationId,
			command.organizationId,
		);
		if (referredConflict) {
			throwPartnersError(
				"PTR_REFERRAL_CONFLICT",
				"referred organization already linked",
			);
		}
		const partnerId = `ptr_prt_${randomUUID()}`;
		const saved = await ctx.partners.save({
			id: partnerId,
			organizationId: command.organizationId,
			referralCode: command.referralCode,
			displayName: command.displayName,
			commissionRate: command.commissionRate,
			referredOrganizationId: command.referredOrganizationId,
			status: "ACTIVE",
			revision: 1,
		});
		const result = partnersCommandResultSchema.parse({
			aggregateId: saved.id,
			revision: saved.revision,
			partnerId: saved.id,
			referralId: saved.referralCode,
		});
		await ctx.commandJournal.save({
			commandId: command.commandId,
			organizationId: command.organizationId,
			commandName: "registerPartner",
			responseSnapshot: toCommandResultSnapshot(result),
		});
		return result;
	});
}
