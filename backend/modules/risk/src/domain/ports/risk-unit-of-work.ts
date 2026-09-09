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
    findActiveByOrganization(organizationId: string): Promise<LimitPolicyRecord | null>;
    save(record: LimitPolicyRecord): Promise<LimitPolicyRecord>;
    supersedeActive(organizationId: string): Promise<void>;
}
export interface EpochRegistryRepository {
    findByOrganization(organizationId: string): Promise<EpochRegistryRecord | null>;
    upsert(record: EpochRegistryRecord): Promise<EpochRegistryRecord>;
}
export interface CheckResultRepository {
    findByIntentHash(organizationId: string, intentHash: string): Promise<CheckResultRecord | null>;
    save(record: CheckResultRecord): Promise<CheckResultRecord>;
}
export interface PermitRepository {
    save(record: PermitRecord): Promise<PermitRecord>;
}
export interface RiskTransactionContext {
    commandJournal: CommandJournalRepository;
    limitPolicies: LimitPolicyRepository;
    epochRegistry: EpochRegistryRepository;
    checkResults: CheckResultRepository;
    permits: PermitRepository;
    publishEvents(envelopes: DomainEventEnvelope[]): Promise<void>;
}
export interface RiskUnitOfWork {
    runInTransaction<T>(work: (ctx: RiskTransactionContext) => Promise<T>): Promise<T>;
}
