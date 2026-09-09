import type { z } from "zod";
import {
    createDelegationCommandSchema,
    governanceCommandResultSchema,
    issueGrantCommandSchema,
    resolveApprovalCommandSchema,
    revokeGrantCommandSchema,
    submitChangeProposalCommandSchema,
} from "../governance/commands";
import { governanceErrorDetailsSchema } from "../governance/errors";
import { T01_INPUT_SCHEMA, T01_OUTPUT_SCHEMA } from "../graph/traversals/T01";
import { registerPrincipalCommandSchema } from "../identity/commands";
import { identityErrorDetailsSchema } from "../identity/errors";
import {
    acceptInviteByTokenCommandSchema,
    activateMembershipCommandSchema,
    commandResultSchema,
    createAgencyCommandSchema,
    inviteMemberCommandSchema,
    revokeMembershipCommandSchema,
    updateAgencyMarketsCommandSchema,
} from "../organizations/commands";
import { organizationErrorDetailsSchema } from "../organizations/errors";

export type CapabilitySchemaRef = string;

export interface CapabilitySchemaBundle {
    input?: z.ZodTypeAny;
    output?: z.ZodTypeAny;
    error?: z.ZodTypeAny;
}

const INPUT_SCHEMAS: Record<CapabilitySchemaRef, z.ZodTypeAny> = {
    registerPrincipalCommandSchema,
    createAgencyCommandSchema,
    updateAgencyMarketsCommandSchema,
    inviteMemberCommandSchema,
    activateMembershipCommandSchema,
    revokeMembershipCommandSchema,
    acceptInviteByTokenCommandSchema,
    issueGrantCommandSchema,
    revokeGrantCommandSchema,
    createDelegationCommandSchema,
    submitChangeProposalCommandSchema,
    resolveApprovalCommandSchema,
    T01_INPUT_SCHEMA,
};

const OUTPUT_SCHEMAS: Record<CapabilitySchemaRef, z.ZodTypeAny> = {
    commandResultSchema,
    governanceCommandResultSchema,
    T01_OUTPUT_SCHEMA,
};

const ERROR_SCHEMAS: Record<CapabilitySchemaRef, z.ZodTypeAny> = {
    identityErrorDetailsSchema,
    organizationErrorDetailsSchema,
    governanceErrorDetailsSchema,
};

export function resolveCapabilitySchemaBundle(ref: CapabilitySchemaRef): CapabilitySchemaBundle {
    return {
        input: INPUT_SCHEMAS[ref],
        output: OUTPUT_SCHEMAS[ref],
        error: ERROR_SCHEMAS[ref],
    };
}

export function getCapabilityInputSchema(ref: CapabilitySchemaRef): z.ZodTypeAny | undefined {
    return INPUT_SCHEMAS[ref];
}

export function getCapabilityOutputSchema(ref: CapabilitySchemaRef): z.ZodTypeAny | undefined {
    return OUTPUT_SCHEMAS[ref];
}

export function getCapabilityErrorSchema(ref: CapabilitySchemaRef): z.ZodTypeAny | undefined {
    return ERROR_SCHEMAS[ref];
}
