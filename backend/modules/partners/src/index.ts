export {
	PartnersCommandError,
	throwPartnersError,
	parseCommandResultSnapshot,
} from "./application/errors";
export {
	PARTNERS_OWNER_DOMAIN,
	registerPartnerCommandSchema,
	partnersCommandResultSchema,
	type PartnersCommandResult,
	type RegisterPartnerCommand,
} from "@anxionos/contracts/partners";
