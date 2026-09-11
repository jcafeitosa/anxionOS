import type { DomainEventEnvelope } from "@anxionos/contracts/events";
import type { CommandJournalRepository } from "./command-journal";
export interface LimitPolicyRecord {
	id: string;
	organizationId: string;
	policyVersion: string;
	maxNotional: string;
	maxLeverage: string | null;
	riskEpoch: number;
	status: string;
}
export interface EpochRegistryRecord {
	organizationId: string;
	currentRiskEpoch: number;
}
export interface CheckResultRecord {
	id: string;
	organizationId: string;
	portfolioId: string;
	intentHash: string;
	notionalAmount: string;
	authorityEpoch: number;
	riskEpoch: number;
	executionMode: string;
	checkResult: string;
	denyReasonCode: string | null;
}
export interface PermitRecord {
	id: string;
	organizationId: string;
	checkId: string;
	intentHash: string;
	authorityEpoch: number;
	riskEpoch: number;
	status: string;
}
export interface LimitPolicyRepository {
	findActiveByOrganization(
		organizationId: string,
	): Promise<LimitPolicyRecord | null>;
	save(record: LimitPolicyRecord): Promise<LimitPolicyRecord>;
	supersedeActive(organizationId: string): Promise<void>;
}
export interface EpochRegistryRepository {
	findByOrganization(
		organizationId: string,
	): Promise<EpochRegistryRecord | null>;
	upsert(record: EpochRegistryRecord): Promise<EpochRegistryRecord>;
}
export interface CheckResultRepository {
	findByIntentHash(
		organizationId: string,
		intentHash: string,
	): Promise<CheckResultRecord | null>;
	save(record: CheckResultRecord): Promise<CheckResultRecord>;
}
export interface PermitRepository {
	save(record: PermitRecord): Promise<PermitRecord>;
	findById(
		organizationId: string,
		permitId: string,
	): Promise<PermitRecord | null>;
	findIssuedBelowEpoch(
		organizationId: string,
		currentRiskEpoch: number,
	): Promise<PermitRecord[]>;
	revokeIssued(input: {
		organizationId: string;
		permitId: string;
	}): Promise<PermitRecord | null>;
}
export interface ConsumerDedupRecord {
	eventId: string;
	consumerName: string;
	organizationId: string;
}
export interface KillSwitchRecord {
	id: string;
	organizationId: string;
	scope: string;
	portfolioId: string | null;
	reason: string;
	activatedBy: string;
	riskEpochAtActivation: number;
	active: boolean;
}
export interface ConsumerDedupRepository {
	findByEventId(eventId: string): Promise<ConsumerDedupRecord | null>;
	save(record: ConsumerDedupRecord): Promise<ConsumerDedupRecord>;
}
export interface KillSwitchStatusRow {
	id?: string;
	organizationId: string;
	scope: string;
	portfolioId: string | null;
	killSwitchActive: boolean;
	reason?: string | null;
	activatedBy?: string | null;
	activatedAt?: string | null;
	releasedAt?: string | null;
	riskEpochAtActivation?: number | null;
}

export interface KillSwitchRepository {
	findActiveForCheck(
		organizationId: string,
		portfolioId: string,
	): Promise<KillSwitchRecord | null>;
	findOrganizationStatus(
		organizationId: string,
	): Promise<KillSwitchStatusRow>;
	save(record: KillSwitchRecord): Promise<KillSwitchRecord>;
	deactivate(input: {
		organizationId: string;
		scope: string;
		portfolioId: string | null;
	}): Promise<KillSwitchRecord | null>;
}
export interface RiskTransactionContext {
	commandJournal: CommandJournalRepository;
	limitPolicies: LimitPolicyRepository;
	epochRegistry: EpochRegistryRepository;
	checkResults: CheckResultRepository;
	permits: PermitRepository;
	killSwitch: KillSwitchRepository;
	consumerDedup: ConsumerDedupRepository;
	publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface RiskUnitOfWork {
	runInTransaction<T>(
		work: (ctx: RiskTransactionContext) => Promise<T>,
	): Promise<T>;
}
