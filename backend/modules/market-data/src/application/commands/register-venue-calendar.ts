import { z } from "zod";
import type {
	MarketCalendarRepository,
	VenueCalendarRecord,
} from "../../domain/ports/market-calendar-repository";
import type { MarketDataUnitOfWork } from "../../domain/ports/market-data-unit-of-work";

export interface RegisterVenueCalendarDeps {
	calendarRepository: MarketCalendarRepository;
	unitOfWork: MarketDataUnitOfWork;
}

export const registerVenueCalendarInputSchema = z.object({
	venueId: z.string().min(1).max(64),
	ianaTimezone: z.string().regex(/^[\w]+[\w./-]*$/), // validates IANA timezone format like "America/New_York"
	scope: z.enum(["stocks", "crypto", "both"]),
	is24x7: z.boolean().default(false),
});

export type RegisterVenueCalendarInput = z.infer<
	typeof registerVenueCalendarInputSchema
>;

export async function registerVenueCalendar(
	deps: RegisterVenueCalendarDeps,
	input: RegisterVenueCalendarInput,
): Promise<
	| { success: true; record: VenueCalendarRecord }
	| { success: false; error: string }
> {
	const validated = registerVenueCalendarInputSchema.parse(input);

	return deps.unitOfWork.runInTransaction(async (ctx) => {
		// First check if a calendar already exists for this venue
		const existing = await ctx.calendarRepository.findVenueCalendar(
			validated.venueId,
		);
		if (existing) {
			// Update existing record - use repository's saveVenueCalendar which is idempotent
			await ctx.calendarRepository.saveVenueCalendar({
				venue_id: existing.venue_id,
				iana_timezone: validated.ianaTimezone,
				scope: validated.scope,
				is_24x7: validated.is24x7,
				created_at: existing.created_at,
				updated_at: new Date(),
			} as VenueCalendarRecord);
			return {
				success: true,
				record: {
					...existing,
					iana_timezone: validated.ianaTimezone,
					scope: validated.scope,
					is_24x7: validated.is24x7,
				},
			};
		}

		// Insert new calendar
		const record = await ctx.calendarRepository.saveVenueCalendar({
			venue_id: validated.venueId,
			iana_timezone: validated.ianaTimezone,
			scope: validated.scope,
			is_24x7: validated.is24x7,
			created_at: new Date(),
			updated_at: new Date(),
		} as VenueCalendarRecord);

		return { success: true, record };
	});
}
