import type { GateId } from "@anxionos/contracts/orchestration";
import type { GateBinding, NewGateBinding } from "../entities/gate-binding";
export interface GateBindingRepository {
    append(binding: NewGateBinding): Promise<GateBinding>;
    findVigentePass(organizationId: string, issueIdentifier: string, gateId: GateId): Promise<GateBinding | null>;
    findVigentePassByIssue(issueIdentifier: string, gateId: GateId): Promise<GateBinding | null>;
    listByIssue(organizationId: string, issueIdentifier: string): Promise<GateBinding[]>;
    invalidatePassBindings(organizationId: string, issueIdentifier: string, gateId: GateId, invalidatedAt: Date): Promise<number>;
}
