import type { Mandate } from "../entities/mandate";

export interface MandateRepository {
	save(mandate: Mandate): Promise<Mandate>;
	findById(mandateId: string): Promise<Mandate | null>;
	findActiveByAgentAndAgency(
		agentId: string,
		agencyId: string,
	): Promise<Mandate | null>;
}
